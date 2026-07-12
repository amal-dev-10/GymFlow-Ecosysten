'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
 Building2,
 MapPin,
 Users,
 Briefcase,
 Activity,
 DollarSign,
 TrendingUp,
 FileText,
 Clock,
 Settings,
 ChevronRight,
 Plus,
 RefreshCw,
 Search,
 Check,
 Shield,
 Layers,
 Phone,
 Mail,
 Globe,
 UploadCloud,
 Download,
 Trash2,
 Lock,
 ArrowRight,
 TrendingDown,
 Info,
 Calendar,
 AlertTriangle,
 UserCheck,
 CheckCircle,
 Sliders,
 X,
 CreditCard,
 Bell,
 Fingerprint,
 Link2,
 ListTodo
} from 'lucide-react';
import { orgApi, gymApi, orgUsersApi, rolesApi, subscriptionApi } from '../../../../lib/api';
import { handleApiError } from '../../../../lib/api/client';
import { useAccessControl } from '../../../../context/access-control';
import { Tabs } from '../../../../components/ui';
import { PlanBadge } from '../../../../components/PlanBadge';
import StatusTab from './StatusTab';
import WorkspaceTab from './WorkspaceTab';
import SubscriptionTab from './SubscriptionTab';

interface OrganizationDetails {
 id: string;
 name: string;
 slug: string;
 logoUrl?: string;
 businessType?: string;
 phone?: string;
 email?: string;
 website?: string;
 addressLine1?: string;
 addressLine2?: string;
 city?: string;
 state?: string;
 country?: string;
 postalCode?: string;
 currency?: string;
 timezone?: string;
 dateFormat?: string;
 language?: string;
 settings?: any;
 createdAt: string;
}

interface GymBranch {
 id: string;
 name: string;
 address: string;
 latitude: number | null;
 longitude: number | null;
 contactPhone?: string;
}

export default function OrganizationDetailsPage() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const initialTab = (searchParams.get('tab') as any) || 'overview';
 const { userRole } = useAccessControl();

 const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'subscription' | 'branches' | 'team' | 'status' | 'settings' | 'documents' | 'workspace'>(initialTab);
 const [loading, setLoading] = useState(true);
 const [org, setOrg] = useState<OrganizationDetails | null>(null);
 const [branches, setBranches] = useState<GymBranch[]>([]);
 const [employees, setEmployees] = useState<any[]>([]);
 const [orgUsers, setOrgUsers] = useState<any[]>([]);
 const [auditLogs, setAuditLogs] = useState<any[]>([]);
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
 const [errorMsg, setErrorMsg] = useState('');
 const [overviewStats, setOverviewStats] = useState({
 totalGyms: 0,
 totalMembers: 0,
 totalEmployees: 0,
 activeMemberships: 0,
 monthlyRevenue: 0,
 pendingDues: 0,
 attendanceToday: 0
 });
 const [activeSubscription, setActiveSubscription] = useState<any>(null);
 const [invoices, setInvoices] = useState<any[]>([]);

 // Search/Filters State
 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState('all');

 // Edit Org Modal state
 const [editModalOpen, setEditModalOpen] = useState(false);
 const [editName, setEditName] = useState('');
 const [editPhone, setEditPhone] = useState('');
 const [editEmail, setEditEmail] = useState('');
 const [editWebsite, setEditWebsite] = useState('');
 const [editAddr1, setEditAddr1] = useState('');
 const [editAddr2, setEditAddr2] = useState('');
 const [editCity, setEditCity] = useState('');
 const [editState, setEditState] = useState('');
 const [editPostalCode, setEditPostalCode] = useState('');
 const [editLogoUrl, setEditLogoUrl] = useState('');
 const [modalLoading, setModalLoading] = useState(false);

 // --- FULL ORGANIZATION SETTINGS STATE ---
 type SettingsTab =
 | 'general'
 | 'regional'
 | 'membership'
 | 'attendance'
 | 'billing'
 | 'notifications'
 | 'security'
 | 'features'
 | 'defaults'
 | 'integrations'
 | 'audit';
 const [settingsSubTab, setSettingsSubTab] = useState<SettingsTab>('general');
 const [savingSettings, setSavingSettings] = useState(false);

 // GENERAL & REGIONAL Settings
 const [settingsName, setSettingsName] = useState('');
 const [settingsBusinessType, setSettingsBusinessType] = useState('Gym');
 const [settingsLogoUrl, setSettingsLogoUrl] = useState('');
 const [settingsPhone, setSettingsPhone] = useState('');
 const [settingsEmail, setSettingsEmail] = useState('');
 const [settingsWebsite, setSettingsWebsite] = useState('');

 const [currencySetting, setCurrencySetting] = useState('USD');
 const [timezoneSetting, setTimezoneSetting] = useState('America/New_York');
 const [dateFormatSetting, setDateFormatSetting] = useState('MM/DD/YYYY');
 const [langSetting, setLangSetting] = useState('en');
 const [timeFormatSetting, setTimeFormatSetting] = useState('12h');
 const [weekStartDaySetting, setWeekStartDaySetting] = useState('monday');

 // MEMBERSHIP SETTINGS
 const [expiryReminderDays, setExpiryReminderDays] = useState(7);
 const [autoExpiryHandling, setAutoExpiryHandling] = useState('deactivate');
 const [freezeAllowed, setFreezeAllowed] = useState(true);
 const [maxFreezeDays, setMaxFreezeDays] = useState(30);
 const [gracePeriod, setGracePeriod] = useState(5);
 const [memberPrefix, setMemberPrefix] = useState('MEM-');

 // ATTENDANCE SETTINGS
 const [attendanceMode, setAttendanceMode] = useState('QR Code');
 const [allowMultipleCheckins, setAllowMultipleCheckins] = useState(false);
 const [lateThreshold, setLateThreshold] = useState(15);
 const [attendanceGrace, setAttendanceGrace] = useState(10);
 const [autoCheckout, setAutoCheckout] = useState(true);

 // BILLING SETTINGS
 const [invoicePrefix, setInvoicePrefix] = useState('INV-');
 const [receiptPrefix, setReceiptPrefix] = useState('RCT-');
 const [taxPercentage, setTaxPercentage] = useState(18);
 const [paymentTerms, setPaymentTerms] = useState('Net 15');
 const [currencySymbol, setCurrencySymbol] = useState('$');

 // NOTIFICATION SETTINGS
 const [notifyExpiryEmail, setNotifyExpiryEmail] = useState(true);
 const [notifyExpirySMS, setNotifyExpirySMS] = useState(false);
 const [notifyPaymentEmail, setNotifyPaymentEmail] = useState(true);
 const [notifyPaymentSMS, setNotifyPaymentSMS] = useState(true);
 const [notifyAttendanceEmail, setNotifyAttendanceEmail] = useState(false);
 const [notifyNewMemberEmail, setNotifyNewMemberEmail] = useState(true);

 // SECURITY SETTINGS
 const [sessionTimeout, setSessionTimeout] = useState(30);
 const [maxActiveSessions, setMaxActiveSessions] = useState(2);
 const [requireOTP, setRequireOTP] = useState(true);
 const [userApprovalRequired, setUserApprovalRequired] = useState(true);
 const [auditRetentionDays, setAuditRetentionDays] = useState(90);

 // GYM DEFAULTS
 const [defaultOpenTime, setDefaultOpenTime] = useState('06:00');
 const [defaultCloseTime, setDefaultCloseTime] = useState('22:00');
 const [defaultGymCurrency, setDefaultGymCurrency] = useState('USD');
 const [defaultGymTerms, setDefaultGymTerms] = useState('Net 15');

 // INTEGRATION SETTINGS
 const [smsProvider, setSmsProvider] = useState('Amazon SNS');
 const [smsApiKey, setSmsApiKey] = useState('');
 const [emailProvider, setEmailProvider] = useState('SendGrid');
 const [emailApiKey, setEmailApiKey] = useState('');
 const [paymentGateway, setPaymentGateway] = useState('Stripe');
 const [paymentGatewayApiKey, setPaymentGatewayApiKey] = useState('');
 const [webhookUrl, setWebhookUrl] = useState('');
 const [webhookSecret, setWebhookSecret] = useState('');

 // Modals & Warning States for Settings
 const [settingsModifiedFields, setSettingsModifiedFields] = useState<{ field: string; oldVal: string; newVal: string }[]>([]);
 const [settingsReviewModalOpen, setSettingsReviewModalOpen] = useState(false);
 const [settingsSuccessModalOpen, setSettingsSuccessModalOpen] = useState(false);
 const [settingsUnsavedWarningOpen, setSettingsUnsavedWarningOpen] = useState(false);
 const [settingsAuditLogs, setSettingsAuditLogs] = useState<any[]>([]);

 const sidebarItems: { id: SettingsTab; label: string; icon: any; desc: string }[] = [
 { id: 'general', label: 'General Info', icon: Building2, desc: 'Logo, name and profile settings' },
 { id: 'regional', label: 'Regional Localizations', icon: Globe, desc: 'Currency, timezone and date formats' },
 { id: 'membership', label: 'Membership Parameters', icon: FileText, desc: 'Expirations, freezes and prefixes' },
 { id: 'attendance', label: 'Attendance Check-in', icon: Calendar, desc: 'QR, biometric and hybrid rules' },
 { id: 'billing', label: 'Billing & Ledgers', icon: DollarSign, desc: 'Invoices, taxation and defaults' },
 { id: 'notifications', label: 'Notifications Channels', icon: Bell, desc: 'SMS, email, and WhatsApp toggles' },
 { id: 'security', label: 'Security & Access', icon: Shield, desc: 'Session timers, approval rules and OTP' },
 { id: 'features', label: 'Feature Access Control', icon: Sliders, desc: 'Subscribed module access limits' },
 { id: 'defaults', label: 'Gym Defaults Builder', icon: MapPin, desc: 'Preset values for new branch locations' },
 { id: 'integrations', label: 'Integrations & Webhooks', icon: Link2, desc: 'SMS, Stripe and developer webhook APIs' },
 { id: 'audit', label: 'Audit settings configuration', icon: Clock, desc: 'Audit retention history and timelines' },
 ];

 // Documents list
 const [documents, setDocuments] = useState<any[]>([]);

 // Document upload modal states
 const [uploadModalOpen, setUploadModalOpen] = useState(false);
 const [selectedFile, setSelectedFile] = useState<File | null>(null);
 const [uploadDocType, setUploadDocType] = useState('Business Registration');
 const [uploadDocName, setUploadDocName] = useState('');

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const loadData = async () => {
 try {
 setLoading(true);
 setErrorMsg('');
 const orgId = localStorage.getItem('organizationId');
 if (!orgId) {
 setErrorMsg('No active organization loaded in session.');
 setLoading(false);
 return;
 }

 // Fetch all user organizations to extract the active one
 const orgs = await orgApi.list();
 const currentOrg = orgs.find((o: any) => o.id === orgId);

 if (currentOrg) {
 setOrg({
 id: currentOrg.id,
 name: currentOrg.name,
 slug: currentOrg.slug,
 logoUrl: currentOrg.logoUrl || '',
 businessType: currentOrg.businessType || 'Gym',
 phone: currentOrg.phone || '+1 (415) 555-0100',
 email: currentOrg.email || 'info@gymflow.io',
 website: currentOrg.website || 'https://gymflow.io',
 addressLine1: currentOrg.addressLine1 || '100 Pine Street',
 addressLine2: currentOrg.addressLine2 || '',
 city: currentOrg.city || 'San Francisco',
 state: currentOrg.state || 'California',
 country: currentOrg.country || 'United States',
 postalCode: currentOrg.postalCode || '94111',
 currency: currentOrg.currency || 'USD',
 timezone: currentOrg.timezone || 'America/New_York',
 dateFormat: currentOrg.dateFormat || 'MM/DD/YYYY',
 language: currentOrg.language || 'en',
 createdAt: currentOrg.createdAt || new Date().toISOString()
 });

 // Sync settings states
 setSettingsName(currentOrg.name);
 setSettingsBusinessType(currentOrg.businessType || 'Gym');
 setSettingsLogoUrl(currentOrg.logoUrl || '');
 setSettingsPhone(currentOrg.phone || '');
 setSettingsEmail(currentOrg.email || '');
 setSettingsWebsite(currentOrg.website || '');

 setCurrencySetting(currentOrg.currency || 'USD');
 setTimezoneSetting(currentOrg.timezone || 'America/New_York');
 setDateFormatSetting(currentOrg.dateFormat || 'MM/DD/YYYY');
 setLangSetting(currentOrg.language || 'en');

 // Parse custom settings JSON
 const settings = currentOrg.settings || {};
 setDocuments(settings.documents || []);

 // Membership Defaults
 const m = settings.membership || {};
 setExpiryReminderDays(m.expiryReminderDays ?? 7);
 setAutoExpiryHandling(m.autoExpiryHandling ?? 'deactivate');
 setFreezeAllowed(m.freezeAllowed ?? true);
 setMaxFreezeDays(m.maxFreezeDays ?? 30);
 setGracePeriod(m.gracePeriod ?? 5);
 setMemberPrefix(m.memberPrefix ?? 'MEM-');

 // Attendance Defaults
 const a = settings.attendance || {};
 setAttendanceMode(a.attendanceMode ?? 'QR Code');
 setAllowMultipleCheckins(a.allowMultipleCheckins ?? false);
 setLateThreshold(a.lateThreshold ?? 15);
 setAttendanceGrace(a.attendanceGrace ?? 10);
 setAutoCheckout(a.autoCheckout ?? true);

 // Billing Defaults
 const b = settings.billing || {};
 setInvoicePrefix(b.invoicePrefix ?? 'INV-');
 setReceiptPrefix(b.receiptPrefix ?? 'RCT-');
 setTaxPercentage(b.taxPercentage ?? 18);
 setPaymentTerms(b.paymentTerms ?? 'Net 15');
 setCurrencySymbol(b.currencySymbol ?? '$');

 // Notifications Defaults
 const n = settings.notifications || {};
 setNotifyExpiryEmail(n.notifyExpiryEmail ?? true);
 setNotifyExpirySMS(n.notifyExpirySMS ?? false);
 setNotifyPaymentEmail(n.notifyPaymentEmail ?? true);
 setNotifyPaymentSMS(n.notifyPaymentSMS ?? true);
 setNotifyAttendanceEmail(n.notifyAttendanceEmail ?? false);
 setNotifyNewMemberEmail(n.notifyNewMemberEmail ?? true);

 // Security Defaults
 const s = settings.security || {};
 setSessionTimeout(s.sessionTimeout ?? 30);
 setMaxActiveSessions(s.maxActiveSessions ?? 2);
 setRequireOTP(s.requireOTP ?? true);
 setUserApprovalRequired(s.userApprovalRequired ?? true);
 setAuditRetentionDays(s.auditRetentionDays ?? 90);

 // Gym Defaults
 const d = settings.gymDefaults || {};
 setDefaultOpenTime(d.defaultOpenTime ?? '06:00');
 setDefaultCloseTime(d.defaultCloseTime ?? '22:00');
 setDefaultGymCurrency(d.defaultGymCurrency ?? 'USD');
 setDefaultGymTerms(d.defaultGymTerms ?? 'Net 15');

 // Integrations Defaults
 const i = settings.integrations || {};
 setSmsProvider(i.smsProvider ?? 'Amazon SNS');
 setSmsApiKey(i.smsApiKey ?? '');
 setEmailProvider(i.emailProvider ?? 'SendGrid');
 setEmailApiKey(i.emailApiKey ?? '');
 setPaymentGateway(i.paymentGateway ?? 'Stripe');
 setPaymentGatewayApiKey(i.paymentGatewayApiKey ?? '');
 setWebhookUrl(i.webhookUrl ?? '');
 setWebhookSecret(i.webhookSecret ?? '');
 } else {
 setErrorMsg('Organization profile could not be found.');
 }

 // Fetch branch gyms
 const dbGyms = await gymApi.list(orgId);
 setBranches(dbGyms || []);

 // Fetch employees & org users
 const dbEmployees = await rolesApi.getEmployees();
 const dbOrgUsers = await orgUsersApi.list();
 setEmployees(dbEmployees || []);
 setOrgUsers(dbOrgUsers || []);

 // Fetch recent audit/roles logs
 const dbLogs = await rolesApi.getAuditLogs();
 setAuditLogs(dbLogs || []);

 const settingsLogs = (dbLogs || []).filter(
 (log: any) =>
 log.eventType === 'ORG_SETTINGS_UPDATED' ||
 log.eventType === 'ORG_SETTINGS_CHANGED'
 );
 setSettingsAuditLogs(settingsLogs);

 // Fetch overview statistics
 const stats = await orgApi.getOverviewStats(orgId);
 setOverviewStats(stats);

 // Fetch subscription & invoices
 try {
 const sub = await subscriptionApi.getActive();
 setActiveSubscription(sub);
 } catch (subErr) {
 console.warn('No active subscription found or failed to fetch:', subErr);
 setActiveSubscription(null);
 }

 try {
 const invs = await subscriptionApi.getInvoices();
 setInvoices(invs);
 } catch (invErr) {
 console.warn('Failed to fetch invoices:', invErr);
 setInvoices([]);
 }
 } catch (err: any) {
 console.error(err);
 setErrorMsg(handleApiError(err) || 'Failed to load organization profile.');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, []);

 const handleOpenEditModal = () => {
 if (!org) return;
 setEditName(org.name);
 setEditPhone(org.phone || '');
 setEditEmail(org.email || '');
 setEditWebsite(org.website || '');
 setEditAddr1(org.addressLine1 || '');
 setEditAddr2(org.addressLine2 || '');
 setEditCity(org.city || '');
 setEditState(org.state || '');
 setEditPostalCode(org.postalCode || '');
 setEditLogoUrl(org.logoUrl || '');
 setEditModalOpen(true);
 };

 const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 const reader = new FileReader();
 reader.onloadend = () => {
 setEditLogoUrl(reader.result as string);
 };
 reader.readAsDataURL(file);
 }
 };

 const handleEditSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!org) return;
 setModalLoading(true);
 try {
 const payload = {
 name: editName,
 logoUrl: editLogoUrl || undefined,
 phone: editPhone,
 email: editEmail,
 website: editWebsite,
 addressLine1: editAddr1,
 addressLine2: editAddr2,
 city: editCity,
 state: editState,
 postalCode: editPostalCode,
 };

 await orgApi.update(org.id, payload);
 showToast('Organization profile updated successfully.', 'success');
 setEditModalOpen(false);
 loadData();
 } catch (err: any) {
 showToast(handleApiError(err) || 'Failed to update organization details.', 'error');
 } finally {
 setModalLoading(false);
 }
 };

 const getSettingsFormPayload = () => {
 return {
 membership: {
 expiryReminderDays,
 autoExpiryHandling,
 freezeAllowed,
 maxFreezeDays,
 gracePeriod,
 memberPrefix,
 },
 attendance: {
 attendanceMode,
 allowMultipleCheckins,
 lateThreshold,
 attendanceGrace,
 autoCheckout,
 },
 billing: {
 invoicePrefix,
 receiptPrefix,
 taxPercentage: Number(taxPercentage),
 paymentTerms,
 currencySymbol,
 },
 notifications: {
 notifyExpiryEmail,
 notifyExpirySMS,
 notifyPaymentEmail,
 notifyPaymentSMS,
 notifyAttendanceEmail,
 notifyNewMemberEmail,
 },
 security: {
 sessionTimeout: Number(sessionTimeout),
 maxActiveSessions: Number(maxActiveSessions),
 requireOTP,
 userApprovalRequired,
 auditRetentionDays: Number(auditRetentionDays),
 },
 gymDefaults: {
 defaultOpenTime,
 defaultCloseTime,
 defaultGymCurrency,
 defaultGymTerms,
 },
 integrations: {
 smsProvider,
 smsApiKey,
 emailProvider,
 emailApiKey,
 paymentGateway,
 paymentGatewayApiKey,
 webhookUrl,
 webhookSecret,
 },
 };
 };

 const getSettingsModifiedFieldsList = () => {
 if (!org) return [];
 const list: { field: string; oldVal: string; newVal: string }[] = [];
 const oldSettings = (org as any).settings || {};
 const newSettings = getSettingsFormPayload();

 const checkKey = (category: string, key: string, label: string) => {
 const oldVal = oldSettings[category]?.[key];
 const newVal = (newSettings as any)[category]?.[key];
 if (newVal !== oldVal) {
 list.push({
 field: `${category.toUpperCase()}: ${label}`,
 oldVal: String(oldVal === undefined ? 'Default' : oldVal),
 newVal: String(newVal === undefined ? 'Empty' : newVal),
 });
 }
 };

 if (currencySetting !== org.currency) list.push({ field: 'Regional: Currency', oldVal: org.currency || 'USD', newVal: currencySetting });
 if (timezoneSetting !== org.timezone) list.push({ field: 'Regional: Timezone', oldVal: org.timezone || 'UTC', newVal: timezoneSetting });
 if (langSetting !== org.language) list.push({ field: 'Regional: Language', oldVal: org.language || 'en', newVal: langSetting });
 if (dateFormatSetting !== org.dateFormat) list.push({ field: 'Regional: Date Format', oldVal: org.dateFormat || 'MM/DD/YYYY', newVal: dateFormatSetting });

 checkKey('membership', 'expiryReminderDays', 'Expiry Reminders');
 checkKey('membership', 'freezeAllowed', 'Allow Freeze');
 checkKey('membership', 'maxFreezeDays', 'Max Freeze Days');
 checkKey('membership', 'memberPrefix', 'Member ID Prefix');

 checkKey('attendance', 'attendanceMode', 'Check-in Mode');
 checkKey('attendance', 'allowMultipleCheckins', 'Multi Check-in');
 checkKey('attendance', 'lateThreshold', 'Late Limit');

 checkKey('billing', 'invoicePrefix', 'Invoice Prefix');
 checkKey('billing', 'taxPercentage', 'Tax Rate');
 checkKey('billing', 'paymentTerms', 'Payment Terms');

 checkKey('security', 'sessionTimeout', 'Session Timeout');
 checkKey('security', 'requireOTP', 'Require OTP Login');

 checkKey('integrations', 'smsProvider', 'SMS Provider');
 checkKey('integrations', 'smsApiKey', 'SMS API Key');
 checkKey('integrations', 'emailProvider', 'Email Provider');
 checkKey('integrations', 'emailApiKey', 'Email API Key');
 checkKey('integrations', 'paymentGateway', 'Payment Gateway');
 checkKey('integrations', 'paymentGatewayApiKey', 'Payment Gateway API Key');
 checkKey('integrations', 'webhookUrl', 'Webhook URL');
 checkKey('integrations', 'webhookSecret', 'Webhook Secret');

 return list;
 };

 const isSettingsFormDirty = () => {
 return getSettingsModifiedFieldsList().length > 0;
 };

 const handleSettingsSaveClick = () => {
 if (!timezoneSetting) {
 showToast('System timezone is required.', 'error');
 return;
 }
 if (!currencySetting) {
 showToast('Default billing currency is required.', 'error');
 return;
 }
 if (taxPercentage < 0 || taxPercentage > 100) {
 showToast('Tax percentage must be between 0% and 100%.', 'error');
 return;
 }

 const modifications = getSettingsModifiedFieldsList();
 if (modifications.length === 0) {
 showToast('No configurations have been updated.', 'error');
 return;
 }

 setSettingsModifiedFields(modifications);
 setSettingsReviewModalOpen(true);
 };

 const confirmSettingsSaveSubmit = async () => {
 if (!org) return;
 setSavingSettings(true);
 try {
 const payload = {
 name: org.name,
 currency: currencySetting,
 timezone: timezoneSetting,
 language: langSetting,
 dateFormat: dateFormatSetting,
 settings: getSettingsFormPayload(),
 };

 await orgApi.update(org.id, payload);
 setSettingsReviewModalOpen(false);
 setSettingsSuccessModalOpen(true);
 showToast('Organization settings saved successfully.', 'success');

 // Apply regional settings immediately and notify workspace layout
 if (payload.currency) localStorage.setItem('orgCurrency', payload.currency);
 if (payload.timezone) localStorage.setItem('orgTimezone', payload.timezone);
 if (payload.dateFormat) localStorage.setItem('orgDateFormat', payload.dateFormat);
 if (payload.language) localStorage.setItem('orgLanguage', payload.language);
 const settingsPayload = payload.settings as any;
 if (settingsPayload?.billing) localStorage.setItem('orgBillingSettings', JSON.stringify(settingsPayload.billing));
 if (settingsPayload?.attendance) localStorage.setItem('orgAttendanceSettings', JSON.stringify(settingsPayload.attendance));
 if (settingsPayload?.membership) localStorage.setItem('orgMembershipSettings', JSON.stringify(settingsPayload.membership));
 if (settingsPayload?.notifications) localStorage.setItem('orgNotificationSettings', JSON.stringify(settingsPayload.notifications));
 if (settingsPayload?.security) localStorage.setItem('orgSecuritySettings', JSON.stringify(settingsPayload.security));
 window.dispatchEvent(new CustomEvent('orgSettingsChanged', { detail: { ...payload, settings: settingsPayload } }));
 } catch (err: any) {
 showToast(handleApiError(err) || 'Failed to save settings.', 'error');
 } finally {
 setSavingSettings(false);
 }
 };

 const handleSettingsDiscardClick = () => {
 if (isSettingsFormDirty()) {
 setSettingsUnsavedWarningOpen(true);
 } else {
 loadData();
 showToast('Configuration edits discarded.');
 }
 };

 const confirmSettingsDiscard = () => {
 setSettingsUnsavedWarningOpen(false);
 loadData();
 showToast('Changes discarded.');
 };

 const handleDocumentDelete = async (id: string) => {
 const updatedDocs = documents.filter(d => d.id !== id);
 try {
 setLoading(true);
 const currentSettings = org?.settings || {};
 const orgId = localStorage.getItem('organizationId') || '';
 await orgApi.update(orgId, {
 settings: {
 ...currentSettings,
 documents: updatedDocs
 }
 });
 setDocuments(updatedDocs);
 showToast('Document removed successfully.', 'success');
 setOrg((prev: any) => ({
 ...prev,
 settings: {
 ...(prev?.settings || {}),
 documents: updatedDocs
 }
 }));
 } catch (err) {
 console.error(err);
 showToast('Failed to delete document from backend.', 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleUploadDocument = () => {
 document.getElementById('org-document-upload-file-input')?.click();
 };

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 setSelectedFile(file);
 setUploadDocName(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
 setUploadDocType('Business Registration');
 setUploadModalOpen(true);

 // Clear file input value to allow triggering change on same file
 if (e.target) e.target.value = '';
 };

 const executeDocumentUpload = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedFile) return;

 const reader = new FileReader();
 reader.onload = async (event) => {
 const fileDataUrl = event.target?.result as string;
 const extension = selectedFile.name.split('.').pop()?.toUpperCase() || 'FILE';
 const newDoc = {
 id: `doc-${Date.now()}`,
 name: `${uploadDocName}.${extension.toLowerCase()}`,
 type: uploadDocType,
 size: `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
 date: new Date().toISOString().split('T')[0],
 url: fileDataUrl
 };

 const updatedDocs = [...documents, newDoc];

 try {
 setLoading(true);
 const currentSettings = org?.settings || {};
 const orgId = localStorage.getItem('organizationId') || '';
 await orgApi.update(orgId, {
 settings: {
 ...currentSettings,
 documents: updatedDocs
 }
 });
 setDocuments(updatedDocs);
 showToast('Document uploaded successfully.', 'success');
 setOrg((prev: any) => ({
 ...prev,
 settings: {
 ...(prev?.settings || {}),
 documents: updatedDocs
 }
 }));
 setUploadModalOpen(false);
 setSelectedFile(null);
 } catch (err) {
 console.error(err);
 showToast('Failed to save document on backend.', 'error');
 } finally {
 setLoading(false);
 }
 };
 reader.readAsDataURL(selectedFile);
 };

 const handleDownloadDocument = (doc: any) => {
 if (!doc.url) {
 showToast('Document content is not available.', 'error');
 return;
 }
 const link = document.createElement('a');
 link.href = doc.url;
 link.download = doc.name;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 showToast(`Downloaded '${doc.name}' successfully.`, 'success');
 };

 // Dynamic aggregates integrated with backend
 const statsKPIs = {
 totalGyms: overviewStats.totalGyms,
 totalMembers: overviewStats.totalMembers,
 totalEmployees: overviewStats.totalEmployees,
 activeMemberships: overviewStats.activeMemberships,
 monthlyRevenue: new Intl.NumberFormat('en-US', { style: 'currency', currency: org?.currency || 'USD' }).format(overviewStats.monthlyRevenue),
 pendingDues: new Intl.NumberFormat('en-US', { style: 'currency', currency: org?.currency || 'USD' }).format(overviewStats.pendingDues),
 activeTrainers: employees.filter((e: any) => e.gyms && e.gyms.length > 0).length || 0,
 attendanceToday: overviewStats.attendanceToday
 };

 const featuresList = [
 { name: 'Members & Athletes', category: 'Members', enabled: true, plan: 'Standard' },
 { name: 'Employees & Trainers', category: 'Employees', enabled: true, plan: 'Standard' },
 { name: 'Memberships Plans', category: 'Memberships', enabled: true, plan: 'Standard' },
 { name: 'Attendance Logging', category: 'Attendance', enabled: true, plan: 'Standard' },
 { name: 'Billing & Invoicing', category: 'Billing', enabled: true, plan: 'Pro Package' },
 { name: 'Expense Tracking', category: 'Expenses', enabled: true, plan: 'Pro Package' },
 { name: 'Workouts Library', category: 'Workouts', enabled: true, plan: 'Standard' },
 { name: 'Diet Customizer', category: 'Diet Plans', enabled: true, plan: 'Standard' },
 { name: 'Personal Coaching', category: 'Personal Training', enabled: false, plan: 'Pro Package', locked: true },
 { name: 'Financial HQ Reports', category: 'Reports', enabled: true, plan: 'Pro Package' },
 { name: 'Role Permission Matrices', category: 'Role Management', enabled: true, plan: 'Pro Package' }
 ];

 if (loading) {
 return (
 <div className="space-y-6 animate-pulse select-none">
 <div className="flex justify-between items-center pb-5 border-b border-neutral-100">
 <div className="space-y-2">
 <div className="h-6 w-48 bg-neutral-100 rounded-lg" />
 <div className="h-4 w-72 bg-neutral-50 rounded-md" />
 </div>
 <div className="h-10 w-28 bg-neutral-100 rounded-xl" />
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="h-48 bg-white border border-neutral-200 rounded-2xl md:col-span-2" />
 <div className="h-48 bg-white border border-neutral-200 rounded-2xl" />
 </div>
 </div>
 );
 }

 if (errorMsg || !org) {
 return (
 <div className="bg-white border border-neutral-100 rounded-3xl p-12 text-center flex flex-col items-center max-w-md mx-auto mt-12">
 <AlertTriangle className="text-danger mb-4" size={36} />
 <h3 className="text-sm font-bold text-neutral-900">Profile Loading Failed</h3>
 <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
 {errorMsg || 'We encountered a problem resolving organization tenancy details.'}
 </p>
 <button
 onClick={loadData}
 className="mt-6 px-4 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-xs font-bold text-neutral-800 rounded-xl flex items-center gap-1.5 cursor-pointer"
 >
 <RefreshCw size={12} />
 <span>Retry Loading</span>
 </button>
 </div>
 );
 }

 return (
 <div className="space-y-6 relative min-h-full">

 {/* Toast Feed */}
 {toast && (
 <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-bold shadow-2xl animate-fade-in ${toast.type === 'success'
 ? 'bg-success-light border-green-200 text-success'
 : 'bg-danger-light border-red-200 text-danger'
 }`}>
 <CheckCircle size={14} />
 <span>{toast.message}</span>
 </div>
 )}

 {/* PAGE HEADER */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-100 pb-5">
 <div>
 <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
 <Building2 className="text-primary" size={20} />
 <span>Organization Details</span>
 <PlanBadge />
 </h2>
 <p className="text-xs text-neutral-500 mt-1">Manage your organization information, subscription, settings, and business overview.</p>
 </div>

 <div className="flex items-center gap-2.5 w-full sm:w-auto">
 <button
 onClick={() => router.push('/workspace/organization/edit')}
 className="flex-1 sm:flex-initial py-2.5 px-4 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 hover:text-neutral-900 transition-all cursor-pointer"
 >
 Edit Organization
 </button>
 {/* <button
 onClick={() => setActiveTab('settings')}
 className="flex-1 sm:flex-initial py-2.5 px-4 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 hover:text-neutral-900 transition-all cursor-pointer"
 >
 Manage Settings
 </button> */}
 {/* <button
 onClick={() => router.push('/workspace/organization/status')}
 className="flex-1 sm:flex-initial py-2.5 px-4 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 hover:text-neutral-900 transition-all cursor-pointer"
 >
 Status Management
 </button> */}
 {/* <button
 onClick={() => setActiveTab('stats')}
 className="flex-1 sm:flex-initial py-2.5 px-4 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
 >
 View Subscription
 </button> */}
 </div>
 </div>

 {/* TABS CONTAINER */}
 <Tabs
 className="mb-4"
 tabs={[
 { id: 'overview', label: 'Overview' },
 { id: 'stats', label: 'Stats & Billing' },
 { id: 'subscription', label: 'Subscription' },
 { id: 'branches', label: 'Branches' },
 { id: 'team', label: 'Team Roles' },
 { id: 'status', label: 'Status Control' },
 { id: 'settings', label: 'Settings' },
 { id: 'documents', label: 'Documents' },
 ...(userRole === 'owner' ? [{ id: 'workspace', label: 'Workspace' }] : [])
 ]}
 activeId={activeTab}
 onChange={(id) => setActiveTab(id as any)}
 />

 {/* ========================================================================= */}
 {/* TAB 1: OVERVIEW */}
 {/* ========================================================================= */}
 {activeTab === 'overview' && (
 <div className="space-y-6 animate-fade-in">

 {/* Main profile row */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

 {/* Overview Card */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-4">
 <div className="flex items-center gap-4 border-b border-neutral-100/60 pb-4">
 {org.logoUrl ? (
 <img src={org.logoUrl} alt="Logo" className="w-16 h-16 rounded-2xl object-cover border border-neutral-200 shadow-md" />
 ) : (
 <div className="w-16 h-16 rounded-2xl bg-primary-light border border-primary/20 flex items-center justify-center text-primary font-extrabold text-xl select-none">
 {org.name.substring(0, 2).toUpperCase()}
 </div>
 )}
 <div>
 <h3 className="text-base font-black text-neutral-900">{org.name}</h3>
 <p className="text-[10px] text-neutral-500 font-semibold mt-0.5 capitalize">Type: {org.businessType}</p>
 {activeSubscription ? (
 <span className="text-[9px] font-bold text-primary bg-primary-light border border-primary/20 px-2.5 py-0.5 rounded-full uppercase mt-2 inline-block">
 {activeSubscription.plan.name} ({activeSubscription.status})
 </span>
 ) : (
 <span className="text-[9px] font-bold text-success bg-success-light border border-green-200 px-2.5 py-0.5 rounded-full uppercase mt-2 inline-block">
 Free Tier
 </span>
 )}
 </div>
 </div>

 <div className="space-y-3.5 text-xs">
 <div className="flex justify-between">
 <span className="text-neutral-500 font-medium">Organization ID:</span>
 <span className="font-mono text-neutral-700 select-all text-right">{org.id}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500 font-medium">Created Date:</span>
 <span className="text-neutral-700 font-semibold">{new Date(org.createdAt).toLocaleDateString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500 font-medium">Status:</span>
 <span className="text-success font-bold flex items-center gap-1.5">
 <span className="w-1.5 h-1.5 rounded-full bg-success" />
 Active
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500 font-medium">Primary Owner:</span>
 <span className="text-neutral-700 font-bold">Marcus Vance</span>
 </div>
 </div>
 </div>

 {/* Address & Contact Card */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-4 lg:col-span-2 flex flex-col justify-between">
 <div>
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider mb-4 select-none">Business Profile Info</h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs">
 <div>
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">Phone Number</span>
 <span className="font-semibold text-neutral-700 mt-1 block">{org.phone}</span>
 </div>
 <div>
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">Email Address</span>
 <span className="font-semibold text-neutral-700 mt-1 block truncate max-w-[200px]">{org.email}</span>
 </div>
 <div>
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">Website URL</span>
 <a href={org.website} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline mt-1 block truncate max-w-[200px]">{org.website}</a>
 </div>
 <div>
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">Business Address</span>
 <p className="text-neutral-700 leading-relaxed mt-1">
 {org.addressLine1}{org.addressLine2 ? `, ${org.addressLine2}` : ''}<br />
 {org.city}, {org.state && `${org.state}, `}{org.country} ({org.postalCode})
 </p>
 </div>
 </div>
 </div>

 <div className="border-t border-neutral-100 pt-4 flex gap-4 text-xs">
 <div>
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">Default Timezone</span>
 <span className="font-semibold text-neutral-600 mt-0.5 block">{org.timezone}</span>
 </div>
 <div>
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">Currency Unit</span>
 <span className="font-bold text-neutral-700 mt-0.5 block">{org.currency}</span>
 </div>
 <div>
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">System Language</span>
 <span className="font-semibold text-neutral-600 mt-0.5 block">{org.language === 'en' ? 'English' : org.language}</span>
 </div>
 </div>
 </div>

 </div>

 {/* Quick stats grid */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {[
 { label: 'Active Gyms', val: statsKPIs.totalGyms, desc: 'Locations registered', color: 'bg-primary-light border-primary/20 text-primary' },
 { label: 'Total Members', val: statsKPIs.totalMembers, desc: 'Across all locations', color: 'bg-primary-light border-green-200 text-success' },
 { label: 'Total Staff', val: statsKPIs.totalEmployees, desc: 'Coaches & managers', color: 'from-blue-500/10 to-blue-600/5 border-blue-500/15 text-blue-400' },
 { label: 'Monthly Revenue', val: statsKPIs.monthlyRevenue, desc: 'Current billing period', color: 'bg-primary-light border-primary/20 text-primary' }
 ].map((kpi, idx) => (
 <div key={idx} className={`p-4 bg-neutral-50/30 border rounded-2xl bg-gradient-to-br transition-all hover:-translate-y-0.5 ${kpi.color}`}>
 <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 block">{kpi.label}</span>
 <span className="text-2xl font-black text-neutral-900 mt-1.5 block">{kpi.val}</span>
 <span className="text-[9px] text-neutral-500 mt-1 block">{kpi.desc}</span>
 </div>
 ))}
 </div>

 {/* Feature and Audit summary block */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

 {/* Audit Logs Overview */}
 <div className="lg:col-span-2 bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-4">
 <div className="flex justify-between items-center select-none">
 <h4 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Audit Security Log Summary</h4>
 <button
 onClick={() => router.push('/workspace/audit-logs/authentication')}
 className="text-[10px] font-bold text-primary hover:text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
 >
 <span>View All Logs</span>
 <ArrowRight size={10} />
 </button>
 </div>

 <div className="relative border-l border-neutral-100 pl-3.5 space-y-3.5 text-xs select-none">
 {auditLogs.slice(0, 4).map((log) => (
 <div key={log.id} className="relative group">
 <span className="absolute left-[-21px] top-1.5 w-2 w-2 rounded-full bg-primary border border-neutral-200" />
 <div className="flex justify-between gap-4">
 <div>
 <span className="font-bold text-neutral-800">{log.action}</span>
 <p className="text-[10px] text-neutral-500 mt-0.5">{log.details}</p>
 </div>
 <span className="text-[9px] font-mono text-neutral-400 shrink-0 text-right">{log.timestamp}</span>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Active Plan Usage status */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-4">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider select-none">Current Plan Usage</h3>
 <div className="space-y-3.5">
 {[
 { name: 'Gym Locations', used: statsKPIs.totalGyms, limit: 5 },
 { name: 'Total Members', used: statsKPIs.totalMembers, limit: 1000 },
 { name: 'Total Employees', used: statsKPIs.totalEmployees, limit: 15 }
 ].map((usage, idx) => {
 const percent = Math.min(100, Math.round((usage.used / usage.limit) * 100));
 return (
 <div key={idx} className="space-y-1.5">
 <div className="flex justify-between text-[11px]">
 <span className="text-neutral-600 font-bold">{usage.name}</span>
 <span className="text-neutral-500">{usage.used} / {usage.limit}</span>
 </div>
 <div className="w-full h-1.5 bg-neutral-50 border border-neutral-100 rounded-full overflow-hidden">
 <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
 </div>
 </div>
 );
 })}
 </div>
 </div>

 </div>

 </div>
 )}

 {/* ========================================================================= */}
 {/* TAB 2: STATS & BILLING */}
 {/* ========================================================================= */}
 {activeTab === 'stats' && (
 <div className="space-y-6 animate-fade-in">

 {/* Subscription Info Card */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl">
 <div className="flex items-center justify-between mb-5">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider select-none">Subscription overview</h3>
 <button
 onClick={() => setActiveTab('subscription')}
 className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
 >
 <span>Manage Subscription</span>
 <ChevronRight size={10} />
 </button>
 </div>

 <div className="p-5 bg-gradient-to-tr from-neutral-50 to-white border border-neutral-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <span className="text-[9px] font-bold text-neutral-500 uppercase">Current Plan</span>
 <span className="block text-xl font-black text-neutral-900 mt-1 flex items-center gap-1.5 flex-wrap">
 {activeSubscription ? activeSubscription.plan.name : 'No Active Plan'}
 {activeSubscription && (
 <span className="px-2 py-0.5 rounded-full bg-success-light border border-green-200 text-[9px] font-extrabold text-success uppercase">
 {activeSubscription.status}
 </span>
 )}
 </span>
 </div>
 <div className="sm:text-right">
 <span className="block text-[10px] text-neutral-500">Renews</span>
 <span className="block text-xs font-black text-primary mt-0.5">
 {activeSubscription ? new Date(activeSubscription.endDate).toLocaleDateString() : 'N/A'}
 </span>
 </div>
 </div>
 </div>

 {/* Financial summary statistics */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

 {/* KPI 1 */}
 <div className="bg-white border border-neutral-200/85 rounded-2xl p-5">
 <div className="flex justify-between items-start">
 <span className="text-[9px] font-bold text-neutral-500 uppercase select-none">Total Monthly Revenue</span>
 <TrendingUp size={14} className="text-success" />
 </div>
 <div className="mt-3">
 <span className="text-2xl font-black text-neutral-900">{statsKPIs.monthlyRevenue}</span>
 <span className="text-[9px] text-neutral-500 block mt-1">Net profit after transaction processing</span>
 </div>
 </div>

 {/* KPI 2 */}
 <div className="bg-white border border-neutral-200/85 rounded-2xl p-5">
 <div className="flex justify-between items-start">
 <span className="text-[9px] font-bold text-neutral-500 uppercase select-none">Pending Payments</span>
 <TrendingDown size={14} className="text-danger" />
 </div>
 <div className="mt-3">
 <span className="text-2xl font-black text-danger">{statsKPIs.pendingDues}</span>
 <span className="text-[9px] text-neutral-400 block mt-1">Outstanding membership renewals</span>
 </div>
 </div>

 {/* KPI 3 */}
 <div className="bg-white border border-neutral-200/85 rounded-2xl p-5">
 <div className="flex justify-between items-start">
 <span className="text-[9px] font-bold text-neutral-400 uppercase select-none">Total Operating Expense</span>
 <Sliders size={14} className="text-blue-400" />
 </div>
 <div className="mt-3">
 <span className="text-2xl font-black text-neutral-900">
 {new Intl.NumberFormat('en-US', { style: 'currency', currency: org?.currency || 'USD' }).format(0)}
 </span>
 <span className="text-[9px] text-neutral-500 block mt-1">Operating expense tracking is not modeled</span>
 </div>
 </div>

 </div>

 {/* Feature Access Overview Checklist */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-4">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider select-none">Feature Access & Plan Compliance</h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
 {featuresList.map((f, idx) => {
 const isLocked = activeSubscription ? f.locked : false;
 const tierLabel = activeSubscription ? f.plan : 'Free';
 return (
 <div key={idx} className="p-3 bg-neutral-50/40 border border-neutral-100 rounded-xl flex items-center justify-between">
 <div>
 <span className="block text-xs font-bold text-neutral-800">{f.name}</span>
 <span className="block text-[8px] text-neutral-500 mt-0.5">Tier: {tierLabel}</span>
 </div>
 {isLocked ? (
 <span className="px-2 py-0.5 bg-danger-light border border-red-200 text-[9px] font-bold text-danger rounded flex items-center gap-1">
 <Lock size={10} /> Locked
 </span>
 ) : (
 <span className="px-2 py-0.5 bg-success-light border border-green-200 text-[9px] font-bold text-success rounded flex items-center gap-0.5">
 <Check size={10} /> Enabled
 </span>
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* Invoice History */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-4">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider select-none">Invoice History</h3>
 {invoices.length === 0 ? (
 <div className="text-center py-6 text-neutral-500 text-xs font-semibold">
 No recent subscription invoices found.
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-xs text-left border-collapse">
 <thead>
 <tr className="border-b border-neutral-200/80 text-neutral-500 text-[9px] font-bold uppercase select-none">
 <th className="py-2.5 px-4">Invoice ID / Plan</th>
 <th className="py-2.5 px-4">Amount</th>
 <th className="py-2.5 px-4">Billing Date</th>
 <th className="py-2.5 px-4">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/40 text-neutral-700">
 {invoices.map((inv) => (
 <tr key={inv.id} className="hover:bg-neutral-50/10 transition-colors">
 <td className="py-3 px-4 font-mono select-all">
 <div>
 <span className="font-bold text-neutral-800 block text-xs">{inv.subscription?.plan?.name || 'SaaS Plan'}</span>
 <span className="text-[10px] text-neutral-500">{inv.id}</span>
 </div>
 </td>
 <td className="py-3 px-4 font-bold text-neutral-900">
 {new Intl.NumberFormat('en-US', { style: 'currency', currency: org?.currency || 'USD' }).format(inv.amount)}
 </td>
 <td className="py-3 px-4 text-neutral-600">
 {new Date(inv.createdAt).toLocaleDateString()}
 </td>
 <td className="py-3 px-4">
 <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${inv.status === 'Paid'
 ? 'bg-success-light text-success border-green-200'
 : 'bg-danger-light text-danger border-red-200'
 }`}>
 {inv.status}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 </div>
 )}

 {/* ========================================================================= */}
 {/* TAB: SUBSCRIPTION */}
 {/* ========================================================================= */}
 {activeTab === 'subscription' && <SubscriptionTab orgId={org.id} />}

 {/* ========================================================================= */}
 {/* TAB 3: BRANCHES */}
 {/* ========================================================================= */}
 {activeTab === 'branches' && (
 <div className="space-y-6 animate-fade-in">

 {/* Branch checklist header */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-50 p-4 border border-neutral-100 rounded-2xl">
 <div>
 <h4 className="text-xs font-bold text-neutral-700">Locations registered under {org.name}</h4>
 <span className="text-[9px] text-neutral-500 block mt-0.5">Managing active physical check-in points</span>
 </div>
 <button
 onClick={() => router.push('/workspace/gyms/create')}
 className="py-2 px-3 bg-primary-light border border-primary/20 hover:bg-primary-light text-primary text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
 >
 <Plus size={12} />
 <span>Register New Branch</span>
 </button>
 </div>

 {branches.length === 0 ? (
 <div className="bg-white border border-neutral-100/90 border-dashed rounded-3xl p-12 text-center flex flex-col items-center">
 <MapPin className="text-neutral-500 mb-4" size={32} />
 <h3 className="text-sm font-bold text-neutral-900">No Branches Configured</h3>
 <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-normal">
 This organization has no physical gym branches loaded yet. Select"Register New Branch" above to add one.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
 {branches.map((b) => (
 <div key={b.id} className="bg-white border border-neutral-200/85 hover:border-primary/20 rounded-3xl p-5 shadow-xl transition-all duration-300 flex flex-col justify-between min-h-[170px]">
 <div>
 <div className="flex justify-between items-start">
 <div className="w-9 h-9 rounded-xl bg-primary-light border border-primary/20 flex items-center justify-center text-primary">
 <MapPin size={16} />
 </div>
 <span className="px-2 py-0.5 bg-success-light border border-green-200 text-[9px] font-bold text-success rounded-full">
 Online
 </span>
 </div>

 <h4 className="text-xs font-black text-neutral-900 mt-4">{b.name}</h4>
 <p className="text-[10px] text-neutral-600 mt-1.5 leading-relaxed truncate max-w-full">{b.address}</p>
 </div>

 <div className="border-t border-neutral-100 pt-3.5 mt-4 flex items-center justify-between text-[10px]">
 <span className="text-neutral-500">Contact: <b className="text-neutral-700">{b.contactPhone || 'N/A'}</b></span>
 <div className="flex gap-3">
 <button
 onClick={() => router.push(`/workspace/gyms/edit?id=${b.id}`)}
 className="text-neutral-600 font-bold hover:text-neutral-800 cursor-pointer"
 >
 Edit
 </button>
 <button
 onClick={() => router.push(`/workspace/gyms/edit?id=${b.id}&tab=media`)}
 className="text-neutral-600 font-bold hover:text-neutral-800 cursor-pointer"
 >
 Media
 </button>
 <button
 onClick={() => {
 localStorage.setItem('activeGymName', b.name);
 showToast(`Switched active branch view to '${b.name}'.`, 'success');
 }}
 className="text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
 >
 <span>Load Branch</span>
 <ArrowRight size={10} />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}

 </div>
 )}

 {/* ========================================================================= */}
 {/* TAB 4: TEAM ROLES */}
 {/* ========================================================================= */}
 {activeTab === 'team' && (
 <div className="space-y-6 animate-fade-in">

 <div className="bg-white border border-neutral-200/85 rounded-3xl overflow-hidden shadow-xl">
 <div className="p-5 border-b border-neutral-100 bg-neutral-50/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div>
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider select-none">Active Brand Managers & Admins</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Verified employee and supervisor workspace assignments.</p>
 </div>
 <button
 onClick={() => router.push('/workspace/users')}
 className="py-2 px-3 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-xs font-bold text-neutral-700 hover:text-neutral-900 rounded-xl transition-all cursor-pointer"
 >
 Add / Manage Users
 </button>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-xs text-left border-collapse">
 <thead>
 <tr className="border-b border-neutral-200/80 text-neutral-500 text-[9px] font-bold uppercase select-none">
 <th className="py-3 px-5">Name / Contact</th>
 <th className="py-3 px-4">Workspace Role</th>
 <th className="py-3 px-4">Status</th>
 <th className="py-3 px-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/40 text-neutral-700">
 {orgUsers.map((user) => (
 <tr key={user.id} className="hover:bg-neutral-50/10 transition-colors">
 <td className="py-3 px-5">
 <div className="flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-[10px] text-primary uppercase select-none">
 {user.name.substring(0, 2)}
 </div>
 <div>
 <span className="block font-bold text-neutral-800">{user.name}</span>
 <span className="block text-[10px] text-neutral-500">{user.phone}</span>
 </div>
 </div>
 </td>
 <td className="py-3 px-4">
 <span className="px-2 py-0.5 rounded bg-primary-light border border-primary/20 text-[9px] font-black text-primary capitalize">
 {user.role.name}
 </span>
 </td>
 <td className="py-3 px-4">
 <span className={`px-2 py-0.5 border text-[9px] font-bold rounded-full ${user.isActive ? 'bg-success-light text-success border-green-200' : 'bg-neutral-50 text-neutral-500 border-neutral-100'
 }`}>
 {user.isActive ? 'Active' : 'Suspended'}
 </span>
 </td>
 <td className="py-3 px-5 text-right">
 <button
 onClick={() => router.push('/workspace/users')}
 className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
 >
 Modify Access
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 </div>
 )}

 {activeTab === 'status' && <StatusTab />}

 {/* ========================================================================= */}
 {/* TAB 5: COMPREHENSIVE SETTINGS */}
 {/* ========================================================================= */}
 {activeTab === 'settings' && (
 <div className="space-y-6 animate-fade-in">
 {/* Settings Sub-Header with Discard / Save controls */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-50 p-4 border border-neutral-100 rounded-2xl mb-4">
 <div>
 <h4 className="text-xs font-bold text-neutral-700">Configure organization-wide business configurations</h4>
 <span className="text-[9px] text-neutral-500 block mt-0.5">Parameters are applied globally across all active branches.</span>
 </div>
 <div className="flex items-center gap-2.5 w-full sm:w-auto">
 {isSettingsFormDirty() && (
 <button
 type="button"
 onClick={handleSettingsDiscardClick}
 className="py-2 px-3 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-xs font-bold text-neutral-700 hover:text-neutral-900 rounded-lg transition-all cursor-pointer"
 >
 Discard Changes
 </button>
 )}
 <button
 type="button"
 onClick={handleSettingsSaveClick}
 className="py-2 px-4 bg-primary text-xs font-bold text-white rounded-lg shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
 >
 Save Settings
 </button>
 </div>
 </div>

 {/* SETTINGS LAYOUT CONTAINER */}
 <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

 {/* LEFT COLUMN: CATEGORIES LIST */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-4 shadow-xl h-fit space-y-1">
 <span className="block text-[9px] font-black uppercase text-neutral-400 px-3.5 mb-2.5 tracking-wider">Settings categories</span>

 {sidebarItems.map((item) => {
 const Icon = item.icon;
 const active = settingsSubTab === item.id;
 return (
 <button
 key={item.id}
 type="button"
 onClick={() => setSettingsSubTab(item.id)}
 className={`w-full text-left px-3.5 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-3 border ${active
 ? 'bg-primary-light border-primary/20 text-primary font-extrabold shadow'
 : 'bg-transparent border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50/20'
 }`}
 >
 <Icon size={15} className="shrink-0" />
 <div className="truncate">
 <span className="block text-xs">{item.label}</span>
 <span className="block text-[8px] text-neutral-500 font-normal truncate max-w-[170px]">{item.desc}</span>
 </div>
 </button>
 );
 })}
 </div>

 {/* RIGHT COLUMN: ACTIVE TAB PANEL */}
 <div className="lg:col-span-3">

 {/* TAB: GENERAL */}
 {settingsSubTab === 'general' && (
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-5 animate-fade-in">
 <div className="border-b border-neutral-100 pb-3 flex justify-between items-start">
 <div>
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">General Profile settings</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Core brand identity and contact channels.</p>
 </div>
 <button
 type="button"
 onClick={() => handleOpenEditModal()}
 className="text-[10px] font-bold text-primary hover:text-primary hover:underline flex items-center gap-1 cursor-pointer"
 >
 <span>Edit Profile Details</span>
 <ArrowRight size={10} />
 </button>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
 <div>
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">Organization Name</span>
 <span className="block font-bold text-neutral-800 mt-1">{settingsName}</span>
 </div>
 <div>
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">Business Industry Type</span>
 <span className="block font-bold text-neutral-700 mt-1">{settingsBusinessType}</span>
 </div>
 <div>
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">Email Address</span>
 <span className="block font-semibold text-neutral-700 mt-1">{settingsEmail || 'N/A'}</span>
 </div>
 <div>
 <span className="block text-[8px] font-bold text-neutral-400 uppercase">Primary Phone</span>
 <span className="block font-semibold text-neutral-700 mt-1">{settingsPhone || 'N/A'}</span>
 </div>
 <div>
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">Website URL</span>
 <span className="block font-semibold text-primary mt-1">{settingsWebsite || 'N/A'}</span>
 </div>
 </div>
 </div>
 )}

 {/* TAB: REGIONAL */}
 {settingsSubTab === 'regional' && (
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-5 animate-fade-in">
 <div className="border-b border-neutral-100 pb-3">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Regional Settings</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Configure default localizations for currency, dates, and times.</p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Base Billing Currency</label>
 <select
 value={currencySetting}
 onChange={(e) => setCurrencySetting(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="USD">USD ($)</option>
 <option value="EUR">EUR (€)</option>
 <option value="GBP">GBP (£)</option>
 <option value="INR">INR (₹)</option>
 <option value="CAD">CAD ($)</option>
 </select>
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">System Timezone</label>
 <select
 value={timezoneSetting}
 onChange={(e) => setTimezoneSetting(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="America/New_York">Eastern Time (EST)</option>
 <option value="America/Chicago">Central Time (CST)</option>
 <option value="America/Los_Angeles">Pacific Time (PST)</option>
 <option value="Europe/London">Greenwich Mean Time (GMT)</option>
 <option value="Asia/Kolkata">Indian Standard Time (IST)</option>
 </select>
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Primary Language</label>
 <select
 value={langSetting}
 onChange={(e) => setLangSetting(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="en">English (US)</option>
 <option value="es">Español</option>
 <option value="fr">Français</option>
 <option value="de">Deutsch</option>
 </select>
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Date Display Format</label>
 <select
 value={dateFormatSetting}
 onChange={(e) => setDateFormatSetting(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="MM/DD/YYYY">MM/DD/YYYY</option>
 <option value="DD/MM/YYYY">DD/MM/YYYY</option>
 <option value="YYYY-MM-DD">YYYY-MM-DD</option>
 </select>
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Time Display Format</label>
 <select
 value={timeFormatSetting}
 onChange={(e) => setTimeFormatSetting(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="12h">12-Hour (AM/PM)</option>
 <option value="24h">24-Hour (Military)</option>
 </select>
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">First Day of Week</label>
 <select
 value={weekStartDaySetting}
 onChange={(e) => setWeekStartDaySetting(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="monday">Monday</option>
 <option value="sunday">Sunday</option>
 </select>
 </div>
 </div>
 </div>
 )}

 {/* TAB: MEMBERSHIP */}
 {settingsSubTab === 'membership' && (
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-5 animate-fade-in">
 <div className="border-b border-neutral-100 pb-3">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Membership Settings</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Control expiry policies, grace periods, and code serialization prefixes.</p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Expiry Reminder Threshold (Days)</label>
 <input
 type="number"
 value={expiryReminderDays}
 onChange={(e) => setExpiryReminderDays(Number(e.target.value))}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Auto Expiry Action</label>
 <select
 value={autoExpiryHandling}
 onChange={(e) => setAutoExpiryHandling(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="deactivate">Deactivate Immediately</option>
 <option value="suspend">Suspend Account & Access</option>
 <option value="grace">Keep active during grace period</option>
 </select>
 </div>
 <div className="p-3 bg-neutral-50/40 border border-neutral-100 rounded-xl flex items-center justify-between col-span-2">
 <div>
 <span className="block text-xs font-bold text-neutral-800">Allow Membership Freeze</span>
 <span className="block text-[9px] text-neutral-500 mt-0.5">Permits members to pause billing for travel or injury reasons.</span>
 </div>
 <button
 type="button"
 onClick={() => setFreezeAllowed(!freezeAllowed)}
 className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${freezeAllowed ? 'bg-primary' : 'bg-neutral-100'
 }`}
 >
 <span
 className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${freezeAllowed ? 'translate-x-4' : 'translate-x-0'
 }`}
 />
 </button>
 </div>
 {freezeAllowed && (
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Maximum Pause Days</label>
 <input
 type="number"
 value={maxFreezeDays}
 onChange={(e) => setMaxFreezeDays(Number(e.target.value))}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 )}
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Renewal Grace Period (Days)</label>
 <input
 type="number"
 value={gracePeriod}
 onChange={(e) => setGracePeriod(Number(e.target.value))}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Member ID Prefix</label>
 <input
 type="text"
 value={memberPrefix}
 onChange={(e) => setMemberPrefix(e.target.value)}
 placeholder="MEM-"
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl col-span-2 text-[10px] text-neutral-600 font-bold">
 Example serial generated: <b className="text-primary">{memberPrefix}000001</b>
 </div>
 </div>
 </div>
 )}

 {/* TAB: ATTENDANCE */}
 {settingsSubTab === 'attendance' && (
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-5 animate-fade-in">
 <div className="border-b border-neutral-100 pb-3">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Attendance Settings</h3>
 <p className="text-[10px] text-neutral-400 mt-0.5">Configure branch access scanners and gate rules.</p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Verification Scan Mode</label>
 <select
 value={attendanceMode}
 onChange={(e) => setAttendanceMode(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="Manual">Manual Receptionist Logging</option>
 <option value="QR Code">Client QR Code Scanner</option>
 <option value="Biometric">Biometric Check-in (Future)</option>
 <option value="Hybrid">Hybrid (QR & Manual)</option>
 </select>
 </div>
 <div className="p-3 bg-neutral-50/40 border border-neutral-100 rounded-xl flex items-center justify-between">
 <div>
 <span className="block text-xs font-bold text-neutral-800">Allow Multiple Check-ins</span>
 <span className="block text-[9px] text-neutral-500 mt-0.5">Allow check-in twice a day.</span>
 </div>
 <button
 type="button"
 onClick={() => setAllowMultipleCheckins(!allowMultipleCheckins)}
 className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${allowMultipleCheckins ? 'bg-primary' : 'bg-neutral-100'
 }`}
 >
 <span
 className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${allowMultipleCheckins ? 'translate-x-4' : 'translate-x-0'
 }`}
 />
 </button>
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Late Threshold (Minutes)</label>
 <input
 type="number"
 value={lateThreshold}
 onChange={(e) => setLateThreshold(Number(e.target.value))}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Check-in Grace Period (Minutes)</label>
 <input
 type="number"
 value={attendanceGrace}
 onChange={(e) => setAttendanceGrace(Number(e.target.value))}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div className="p-3 bg-neutral-50/40 border border-neutral-100 rounded-xl flex items-center justify-between col-span-2">
 <div>
 <span className="block text-xs font-bold text-neutral-800">Enable Auto Check-out</span>
 <span className="block text-[9px] text-neutral-500 mt-0.5">Automatically checks-out users after 4 hours of inactivity.</span>
 </div>
 <button
 type="button"
 onClick={() => setAutoCheckout(!autoCheckout)}
 className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${autoCheckout ? 'bg-primary' : 'bg-neutral-100'
 }`}
 >
 <span
 className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoCheckout ? 'translate-x-4' : 'translate-x-0'
 }`}
 />
 </button>
 </div>
 </div>
 </div>
 )}

 {/* TAB: BILLING */}
 {settingsSubTab === 'billing' && (
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-5 animate-fade-in">
 <div className="border-b border-neutral-100 pb-3">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Billing & Ledgers Settings</h3>
 <p className="text-[10px] text-neutral-400 mt-0.5">Set defaults for taxation, invoicing and payment terms.</p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Invoice Code Prefix</label>
 <input
 type="text"
 value={invoicePrefix}
 onChange={(e) => setInvoicePrefix(e.target.value)}
 placeholder="INV-"
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Receipt Code Prefix</label>
 <input
 type="text"
 value={receiptPrefix}
 onChange={(e) => setReceiptPrefix(e.target.value)}
 placeholder="RCT-"
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Default Tax Rate (%)</label>
 <input
 type="number"
 value={taxPercentage}
 onChange={(e) => setTaxPercentage(Number(e.target.value))}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Payment Terms</label>
 <select
 value={paymentTerms}
 onChange={(e) => setPaymentTerms(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="Due on Receipt">Due on Receipt</option>
 <option value="Net 15">Net 15 Days</option>
 <option value="Net 30">Net 30 Days</option>
 </select>
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Currency Symbol</label>
 <input
 type="text"
 value={currencySymbol}
 onChange={(e) => setCurrencySymbol(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 </div>
 </div>
 )}

 {/* TAB: NOTIFICATIONS */}
 {settingsSubTab === 'notifications' && (
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-5 animate-fade-in">
 <div className="border-b border-neutral-100 pb-3">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Notifications Channels</h3>
 <p className="text-[10px] text-neutral-400 mt-0.5">Toggle automated emails, SMS, and WhatsApp check-in notification alerts.</p>
 </div>

 <div className="space-y-4">

 {/* Expiring Alert */}
 <div className="p-4 bg-neutral-50/40 border border-neutral-100 rounded-2xl space-y-3">
 <div className="flex justify-between items-center">
 <span className="block text-xs font-bold text-neutral-800">Membership Expiry Reminders</span>
 <span className="text-[9px] text-neutral-500 font-semibold">Pre-expiry notifications</span>
 </div>
 <div className="flex gap-4 text-xs select-none">
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={notifyExpiryEmail}
 onChange={(e) => setNotifyExpiryEmail(e.target.checked)}
 className="rounded bg-neutral-50 border-neutral-200 text-primary outline-none"
 />
 <span>Email Alerts</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={notifyExpirySMS}
 onChange={(e) => setNotifyExpirySMS(e.target.checked)}
 className="rounded bg-neutral-50 border-neutral-200 text-primary outline-none"
 />
 <span>SMS Alerts</span>
 </label>
 </div>
 </div>

 {/* Payments Reminder */}
 <div className="p-4 bg-neutral-50/40 border border-neutral-100 rounded-2xl space-y-3">
 <div className="flex justify-between items-center">
 <span className="block text-xs font-bold text-neutral-800">Payment & Invoicing Notifications</span>
 <span className="text-[9px] text-neutral-500 font-semibold">Overdue billing items</span>
 </div>
 <div className="flex gap-4 text-xs select-none">
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={notifyPaymentEmail}
 onChange={(e) => setNotifyPaymentEmail(e.target.checked)}
 className="rounded bg-neutral-50 border-neutral-200 text-primary"
 />
 <span>Email Invoice</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={notifyPaymentSMS}
 onChange={(e) => setNotifyPaymentSMS(e.target.checked)}
 className="rounded bg-neutral-50 border-neutral-200 text-primary"
 />
 <span>SMS Invoicing</span>
 </label>
 </div>
 </div>

 {/* Checkin Alerts */}
 <div className="p-4 bg-neutral-50/40 border border-neutral-100 rounded-2xl space-y-3">
 <div className="flex justify-between items-center">
 <span className="block text-xs font-bold text-neutral-800">Attendance Scan Logs</span>
 <span className="text-[9px] text-neutral-500 font-semibold">Daily check-in registers</span>
 </div>
 <div className="flex gap-4 text-xs select-none">
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={notifyAttendanceEmail}
 onChange={(e) => setNotifyAttendanceEmail(e.target.checked)}
 className="rounded bg-neutral-50 border-neutral-200 text-primary"
 />
 <span>Send Daily Email Summary</span>
 </label>
 </div>
 </div>

 </div>
 </div>
 )}

 {/* TAB: SECURITY */}
 {settingsSubTab === 'security' && (
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-5 animate-fade-in">
 <div className="border-b border-neutral-100 pb-3">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Security & Access Settings</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Configure authentication parameters and log policies.</p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Session Expiry Timeout (Minutes)</label>
 <input
 type="number"
 value={sessionTimeout}
 onChange={(e) => setSessionTimeout(Number(e.target.value))}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Max Concurrent Active Sessions</label>
 <input
 type="number"
 value={maxActiveSessions}
 onChange={(e) => setMaxActiveSessions(Number(e.target.value))}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div className="p-3 bg-neutral-50/40 border border-neutral-100 rounded-xl flex items-center justify-between">
 <div>
 <span className="block text-xs font-bold text-neutral-800">Require OTP On Login</span>
 <span className="block text-[9px] text-neutral-500 mt-0.5">Enforces 2FA verification codes.</span>
 </div>
 <button
 type="button"
 onClick={() => setRequireOTP(!requireOTP)}
 className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${requireOTP ? 'bg-primary' : 'bg-neutral-100'
 }`}
 >
 <span
 className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${requireOTP ? 'translate-x-4' : 'translate-x-0'
 }`}
 />
 </button>
 </div>
 <div className="p-3 bg-neutral-50/40 border border-neutral-100 rounded-xl flex items-center justify-between">
 <div>
 <span className="block text-xs font-bold text-neutral-800">User Invitation Approval</span>
 <span className="block text-[9px] text-neutral-500 mt-0.5">Requires Owner approval for new workspace invitations.</span>
 </div>
 <button
 type="button"
 onClick={() => setUserApprovalRequired(!userApprovalRequired)}
 className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${userApprovalRequired ? 'bg-primary' : 'bg-neutral-100'
 }`}
 >
 <span
 className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${userApprovalRequired ? 'translate-x-4' : 'translate-x-0'
 }`}
 />
 </button>
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Audit Log Retention (Days)</label>
 <select
 value={auditRetentionDays}
 onChange={(e) => setAuditRetentionDays(Number(e.target.value))}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value={30}>30 Days (Hot Storage)</option>
 <option value={90}>90 Days (Enterprise Standard)</option>
 <option value={365}>1 Year (Compliance standard)</option>
 </select>
 </div>
 </div>
 </div>
 )}

 {/* TAB: FEATURES */}
 {settingsSubTab === 'features' && (
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-5 animate-fade-in">
 <div className="border-b border-neutral-100 pb-3">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Feature Access Overview</h3>
 <p className="text-[10px] text-neutral-400 mt-0.5 font-medium">Verify enabled configurations matching active Pro subscriptions.</p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
 {featuresList.map((f, idx) => (
 <div key={idx} className="p-3 bg-neutral-50/40 border border-neutral-100 rounded-xl flex items-center justify-between">
 <div>
 <span className="block text-xs font-bold text-neutral-800">{f.name}</span>
 <span className="block text-[8px] text-neutral-500 mt-0.5">Tier: {f.plan}</span>
 </div>
 {f.locked ? (
 <span className="px-2 py-0.5 bg-danger-light border border-red-200 text-[9px] font-bold text-danger rounded flex items-center gap-1">
 <Lock size={10} /> Locked
 </span>
 ) : (
 <span className="px-2 py-0.5 bg-success-light border border-green-200 text-[9px] font-bold text-success rounded flex items-center gap-0.5">
 <Check size={10} /> Enabled
 </span>
 )}
 </div>
 ))}
 </div>

 {/* Upgrade Banner CTA */}
 <div className="p-4 bg-primary-light border border-primary/20 rounded-2xl flex items-center justify-between gap-4">
 <div>
 <h4 className="text-xs font-black text-neutral-900">Unlock Personal coaching & custom training routines</h4>
 <span className="text-[9px] text-neutral-500 block mt-0.5">Upgrade your active organization plan to the Enterprise tier.</span>
 </div>
 <button
 type="button"
 onClick={() => showToast('Redirecting to plans page...')}
 className="px-3.5 py-2 bg-primary text-[10px] font-bold text-white rounded-lg cursor-pointer"
 >
 Upgrade Tier
 </button>
 </div>
 </div>
 )}

 {/* TAB: DEFAULTS */}
 {settingsSubTab === 'defaults' && (
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-5 animate-fade-in">
 <div className="border-b border-neutral-100 pb-3">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Gym Defaults</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Define preset configurations applied automatically when registering a new branch location.</p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Default Opening Time</label>
 <input
 type="time"
 value={defaultOpenTime}
 onChange={(e) => setDefaultOpenTime(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Default Closing Time</label>
 <input
 type="time"
 value={defaultCloseTime}
 onChange={(e) => setDefaultCloseTime(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Default Currency</label>
 <select
 value={defaultGymCurrency}
 onChange={(e) => setDefaultGymCurrency(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="USD">USD ($)</option>
 <option value="INR">INR (₹)</option>
 <option value="EUR">EUR (€)</option>
 </select>
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Default Billing Terms</label>
 <select
 value={defaultGymTerms}
 onChange={(e) => setDefaultGymTerms(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="Due on Receipt">Due on Receipt</option>
 <option value="Net 15">Net 15 Days</option>
 <option value="Net 30">Net 30 Days</option>
 </select>
 </div>
 </div>
 </div>
 )}

 {/* TAB: INTEGRATIONS */}
 {settingsSubTab === 'integrations' && (
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-5 animate-fade-in">
 <div className="border-b border-neutral-100 pb-3">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Integrations & Webhooks</h3>
 <p className="text-[10px] text-neutral-400 mt-0.5 font-medium">Link billing gateways, SMS notification channels, and webhook integrations.</p>
 </div>

 <div className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 {/* Payment Gateway */}
 <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl flex flex-col justify-between min-h-[180px]">
 <div>
 <label className="block text-[8px] font-extrabold uppercase text-neutral-500 mb-1">Payment Gateway</label>
 <select
 value={paymentGateway}
 onChange={(e) => {
 setPaymentGateway(e.target.value);
 if (e.target.value === 'None') setPaymentGatewayApiKey('');
 }}
 className="w-full bg-white border border-neutral-100 rounded-xl p-2 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="Stripe">Stripe Inc</option>
 <option value="PayPal">PayPal Commerce</option>
 <option value="Adyen">Adyen Payment</option>
 <option value="None">None (Disabled)</option>
 </select>
 <input
 type="password"
 placeholder="API Key / Token"
 value={paymentGatewayApiKey}
 onChange={(e) => setPaymentGatewayApiKey(e.target.value)}
 disabled={paymentGateway === 'None'}
 className="w-full bg-white border border-neutral-100 rounded-xl p-2 mt-2 text-[10px] text-neutral-900 placeholder-neutral-400 outline-none disabled:opacity-30"
 />
 </div>
 <span className={`px-2 py-0.5 mt-2 text-[8px] font-bold rounded w-fit ${
 paymentGateway === 'None' ? 'bg-neutral-50 border border-neutral-200 text-neutral-500' :
 paymentGatewayApiKey ? 'bg-success-light border border-green-200 text-success' :
 'bg-warning-light border border-amber-200 text-amber-700'
 }`}>
 {paymentGateway === 'None' ? 'Disabled' : paymentGatewayApiKey ? 'Connected' : 'Not Configured'}
 </span>
 </div>

 {/* SMS Gateway */}
 <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl flex flex-col justify-between min-h-[180px]">
 <div>
 <label className="block text-[8px] font-extrabold uppercase text-neutral-500 mb-1">SMS Provider</label>
 <select
 value={smsProvider}
 onChange={(e) => {
 setSmsProvider(e.target.value);
 if (e.target.value === 'None') setSmsApiKey('');
 }}
 className="w-full bg-white border border-neutral-100 rounded-xl p-2 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="Amazon SNS">Amazon SNS</option>
 <option value="Twilio">Twilio SMS</option>
 <option value="Msg91">Msg91 Gateway</option>
 <option value="None">None (Disabled)</option>
 </select>
 <input
 type="password"
 placeholder="API Key / Secret Token"
 value={smsApiKey}
 onChange={(e) => setSmsApiKey(e.target.value)}
 disabled={smsProvider === 'None'}
 className="w-full bg-white border border-neutral-100 rounded-xl p-2 mt-2 text-[10px] text-neutral-900 placeholder-neutral-400 outline-none disabled:opacity-30"
 />
 </div>
 <span className={`px-2 py-0.5 mt-2 text-[8px] font-bold rounded w-fit ${
 smsProvider === 'None' ? 'bg-neutral-50 border border-neutral-200 text-neutral-500' :
 smsApiKey ? 'bg-success-light border border-green-200 text-success' :
 'bg-warning-light border border-amber-200 text-amber-700'
 }`}>
 {smsProvider === 'None' ? 'Disabled' : smsApiKey ? 'Connected' : 'Not Configured'}
 </span>
 </div>

 {/* Email Gateway */}
 <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl flex flex-col justify-between min-h-[180px]">
 <div>
 <label className="block text-[8px] font-extrabold uppercase text-neutral-500 mb-1">Email Provider</label>
 <select
 value={emailProvider}
 onChange={(e) => {
 setEmailProvider(e.target.value);
 if (e.target.value === 'None') setEmailApiKey('');
 }}
 className="w-full bg-white border border-neutral-100 rounded-xl p-2 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="SendGrid">SendGrid</option>
 <option value="Mailgun">Mailgun API</option>
 <option value="Amazon SES">Amazon SES</option>
 <option value="None">None (Disabled)</option>
 </select>
 <input
 type="password"
 placeholder="API Secret Key"
 value={emailApiKey}
 onChange={(e) => setEmailApiKey(e.target.value)}
 disabled={emailProvider === 'None'}
 className="w-full bg-white border border-neutral-100 rounded-xl p-2 mt-2 text-[10px] text-neutral-900 placeholder-neutral-400 outline-none disabled:opacity-30"
 />
 </div>
 <span className={`px-2 py-0.5 mt-2 text-[8px] font-bold rounded w-fit ${
 emailProvider === 'None' ? 'bg-neutral-50 border border-neutral-200 text-neutral-500' :
 emailApiKey ? 'bg-success-light border border-green-200 text-success' :
 'bg-warning-light border border-amber-200 text-amber-700'
 }`}>
 {emailProvider === 'None' ? 'Disabled' : emailApiKey ? 'Connected' : 'Not Configured'}
 </span>
 </div>
 </div>

 {/* Webhook Settings */}
 <div className="p-4 bg-neutral-50/40 border border-neutral-100 rounded-2xl space-y-3.5">
 <span className="block text-xs font-bold text-neutral-800">Webhook Subscriptions</span>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-[8px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Webhook Endpoint URL</label>
 <input
 type="url"
 value={webhookUrl}
 onChange={(e) => setWebhookUrl(e.target.value)}
 placeholder="https://api.yourdomain.com/webhooks/gymflow"
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none"
 />
 </div>
 <div>
 <label className="block text-[8px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Webhook signing Secret</label>
 <input
 type="password"
 value={webhookSecret}
 onChange={(e) => setWebhookSecret(e.target.value)}
 placeholder="whsec_..."
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none"
 />
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* TAB: AUDIT */}
 {settingsSubTab === 'audit' && (
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-5 animate-fade-in">
 <div className="border-b border-neutral-100 pb-3 flex justify-between items-center">
 <div>
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Settings Audit History</h3>
 <p className="text-[10px] text-neutral-400 mt-0.5 font-medium">Chronological record of recent workspace configurations.</p>
 </div>
 </div>

 {settingsAuditLogs.length === 0 ? (
 <div className="p-8 bg-neutral-50/40 border border-neutral-100 border-dashed rounded-3xl text-center select-none">
 <Clock className="text-neutral-400 mx-auto mb-3" size={28} />
 <h4 className="text-xs font-bold text-neutral-900">No Configuration Audit History</h4>
 <span className="text-[10px] text-neutral-500 block mt-1">There are no settings changes recorded inside the audit security filters.</span>
 </div>
 ) : (
 <div className="relative border-l border-neutral-100 pl-3.5 space-y-4 text-xs select-none">
 {settingsAuditLogs.slice(0, 8).map((log) => (
 <div key={log.id} className="relative group">
 <span className="absolute left-[-21px] top-1.5 w-2 h-2 rounded-full bg-primary border border-neutral-200" />
 <div className="flex justify-between gap-4">
 <div>
 <span className="font-bold text-neutral-800">{log.action}</span>
 <p className="text-[10px] text-neutral-500 mt-0.5">{log.details}</p>
 <span className="block text-[9px] text-neutral-400 mt-0.5">Modified by: {log.user}</span>
 </div>
 <span className="text-[8px] font-mono text-neutral-400 shrink-0 text-right">{log.timestamp}</span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* TAB 6: DOCUMENTS */}
 {/* ========================================================================= */}
 {activeTab === 'documents' && (
 <div className="space-y-6 animate-fade-in">

 <div className="flex justify-between items-center bg-neutral-50 p-4 border border-neutral-100 rounded-2xl">
 <div>
 <h4 className="text-xs font-bold text-neutral-700">Company Registration & License Documents</h4>
 <span className="text-[9px] text-neutral-500 block mt-0.5">Upload verified legal, GST, and business certificate documentation</span>
 </div>
 <button
 onClick={handleUploadDocument}
 className="py-2 px-3 bg-primary-light border border-primary/20 hover:bg-primary-light text-primary text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
 >
 <UploadCloud size={12} />
 <span>Upload Document</span>
 </button>
 </div>

 <input
 type="file"
 id="org-document-upload-file-input"
 style={{ display: 'none' }}
 onChange={handleFileChange}
 />

 {documents.length === 0 ? (
 <div className="bg-white border border-dashed border-neutral-100/90 rounded-3xl p-12 text-center flex flex-col items-center">
 <FileText className="text-neutral-500 mb-4" size={32} />
 <h3 className="text-sm font-bold text-neutral-900">No Legal Documents Uploaded</h3>
 <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-normal">
 There are no legal certificates registered. Upload GST, registration, or business certificates for compliance.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
 {documents.map((doc) => (
 <div key={doc.id} className="bg-white border border-neutral-200/85 rounded-3xl p-5 shadow-xl flex flex-col justify-between min-h-[160px]">
 <div className="flex items-start justify-between">
 <div className="w-9 h-9 rounded-xl bg-primary-light border border-primary/20 flex items-center justify-center text-primary overflow-hidden shrink-0">
 {doc.url && ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF'].includes(doc.name.split('.').pop()?.toUpperCase() || '') ? (
 <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
 ) : (
 <FileText size={16} />
 )}
 </div>
 <span className="px-2 py-0.5 bg-neutral-50 border border-neutral-100 text-[8px] font-bold text-neutral-600 rounded">
 {doc.type}
 </span>
 </div>

 <div className="mt-4">
 <h4 className="text-xs font-black text-neutral-800 truncate pr-2" title={doc.name}>{doc.name}</h4>
 <span className="text-[9px] text-neutral-500 block mt-1">Uploaded: {new Date(doc.date).toLocaleDateString()} • {doc.size}</span>
 </div>

 <div className="border-t border-neutral-100 pt-3.5 mt-4 flex items-center justify-between">
 <button
 onClick={() => handleDownloadDocument(doc)}
 className="text-[10px] font-bold text-primary hover:text-primary flex items-center gap-1 cursor-pointer"
 >
 <Download size={11} />
 <span>Download</span>
 </button>
 <button
 onClick={() => handleDocumentDelete(doc.id)}
 className="p-1 rounded hover:bg-danger-light text-neutral-400 hover:text-danger transition-colors cursor-pointer"
 title="Remove document"
 >
 <Trash2 size={12} />
 </button>
 </div>
 </div>
 ))}
 </div>
 )}

 </div>
 )}

 {/* ========================================================================= */}
 {/* UPLOAD DOCUMENT MODAL */}
 {/* ========================================================================= */}
 {uploadModalOpen && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background backdrop-blur-md animate-fade-in">
 <div className="fixed inset-0" onClick={() => setUploadModalOpen(false)} />

 <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-3xl p-7 shadow-2xl relative z-10 animate-scale-up">
 <div className="flex justify-between items-start mb-5">
 <div>
 <h3 className="text-lg font-extrabold text-neutral-900">Upload Organization Document</h3>
 <p className="text-[10px] text-neutral-600 mt-1">Provide document metadata details before uploading.</p>
 </div>
 <button
 onClick={() => setUploadModalOpen(false)}
 className="text-neutral-500 hover:text-neutral-800 cursor-pointer bg-transparent border-none animate-fade-in"
 >
 <X size={18} />
 </button>
 </div>

 <form onSubmit={executeDocumentUpload} className="space-y-4 text-xs">
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Document Details Type</label>
 <select
 value={uploadDocType}
 onChange={(e) => setUploadDocType(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="Business Registration">Business Registration</option>
 <option value="GST / Tax Certificate">GST / Tax Certificate</option>
 <option value="Safety License">Safety License</option>
 <option value="Insurance Contract">Insurance Contract</option>
 <option value="Lease Agreement">Lease Agreement</option>
 <option value="Other">Other Certificate / File</option>
 </select>
 </div>

 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">Document Name</label>
 <input
 type="text"
 required
 value={uploadDocName}
 onChange={(e) => setUploadDocName(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>

 <div className="pt-2 flex gap-3">
 <button
 type="button"
 onClick={() => setUploadModalOpen(false)}
 className="flex-1 py-2.5 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-bold rounded-xl cursor-pointer animate-fade-in"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="flex-1 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer animate-fade-in"
 >
 Confirm Upload
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* TAB: WORKSPACE EXPERIENCE */}
 {/* ========================================================================= */}
 {activeTab === 'workspace' && userRole === 'owner' && <WorkspaceTab />}

 {editModalOpen && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background backdrop-blur-md animate-fade-in">
 <div className="fixed inset-0" onClick={() => setEditModalOpen(false)} />

 <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-3xl p-7 shadow-2xl relative z-10 animate-scale-up max-h-[90vh] overflow-y-auto scrollbar-thin">

 <div className="flex justify-between items-start mb-5">
 <div>
 <h3 className="text-lg font-extrabold text-neutral-900">Edit Organization Profile</h3>
 <p className="text-[10px] text-neutral-600 mt-1">Modify your central business name, branding and address configurations.</p>
 </div>
 <button
 onClick={() => setEditModalOpen(false)}
 className="text-neutral-500 hover:text-neutral-800 cursor-pointer"
 >
 <X size={18} />
 </button>
 </div>

 <form onSubmit={handleEditSubmit} className="space-y-4">
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Organization Logo</label>
 <div className="flex items-center gap-4 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
 {editLogoUrl ? (
 <img src={editLogoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-neutral-200 shadow" />
 ) : (
 <div className="w-12 h-12 rounded-xl bg-primary-light border border-primary/20 flex items-center justify-center text-primary font-extrabold text-sm">
 GF
 </div>
 )}
 <label className="px-3.5 py-1.5 bg-primary-light border border-primary/20 hover:bg-primary-light text-[10px] font-bold text-primary rounded-lg cursor-pointer transition-all">
 Upload New
 <input type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
 </label>
 </div>
 </div>

 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Organization Name</label>
 <input
 required
 type="text"
 value={editName}
 onChange={(e) => setEditName(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none outline-none transition-all"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Phone Number</label>
 <input
 required
 type="text"
 value={editPhone}
 onChange={(e) => setEditPhone(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>

 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Email Address</label>
 <input
 required
 type="email"
 value={editEmail}
 onChange={(e) => setEditEmail(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 </div>

 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Website</label>
 <input
 type="url"
 value={editWebsite}
 onChange={(e) => setEditWebsite(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 outline-none"
 />
 </div>

 <div className="border-t border-neutral-100/60 pt-3">
 <span className="block text-[9px] font-bold text-neutral-500 uppercase mb-2 select-none">Physical Address details</span>

 <div className="space-y-3.5">
 <div>
 <label className="block text-[8px] font-bold text-neutral-500 uppercase mb-1">Address Line 1</label>
 <input
 required
 type="text"
 value={editAddr1}
 onChange={(e) => setEditAddr1(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>

 <div>
 <label className="block text-[8px] font-bold text-neutral-500 uppercase mb-1">Address Line 2 (Optional)</label>
 <input
 type="text"
 value={editAddr2}
 onChange={(e) => setEditAddr2(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>

 <div className="grid grid-cols-3 gap-2">
 <div className="col-span-2">
 <label className="block text-[8px] font-bold text-neutral-500 uppercase mb-1">City</label>
 <input
 required
 type="text"
 value={editCity}
 onChange={(e) => setEditCity(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[8px] font-bold text-neutral-500 uppercase mb-1">ZIP Code</label>
 <input
 required
 type="text"
 value={editPostalCode}
 onChange={(e) => setEditPostalCode(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 </div>
 </div>
 </div>

 <div className="flex gap-3 pt-4">
 <button
 type="button"
 onClick={() => setEditModalOpen(false)}
 className="flex-1 py-3.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-800 transition-all cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={modalLoading}
 className="flex-1 py-3.5 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
 >
 {modalLoading ? <RefreshCw className="animate-spin" size={13} /> : <span>Save Changes</span>}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 {/* ========================================================================= */}
 {/* DIALOGS FOR SETTINGS EDITING */}
 {/* ========================================================================= */}
 {settingsReviewModalOpen && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background backdrop-blur-md animate-fade-in">
 <div className="fixed inset-0" onClick={() => setSettingsReviewModalOpen(false)} />

 <div className="w-full max-w-lg bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-2xl relative z-10 animate-scale-up max-h-[85vh] flex flex-col justify-between">
 <div>
 <div className="flex justify-between items-start border-b border-neutral-100 pb-3 mb-4">
 <div>
 <h3 className="text-base font-extrabold text-neutral-900">Review Settings Changes</h3>
 <p className="text-[10px] text-neutral-600 mt-1">Please confirm modifications to the organization business parameters.</p>
 </div>
 <button
 type="button"
 onClick={() => setSettingsReviewModalOpen(false)}
 className="text-neutral-500 hover:text-neutral-800 cursor-pointer"
 >
 <X size={18} />
 </button>
 </div>

 {/* Modifications summary list */}
 <div className="overflow-y-auto scrollbar-thin max-h-[40vh] border border-neutral-100 rounded-2xl bg-neutral-50/40">
 <table className="w-full text-[11px] text-left border-collapse">
 <thead>
 <tr className="border-b border-neutral-100 text-neutral-500 font-bold uppercase text-[8px] select-none">
 <th className="py-2.5 px-4">Setting Config</th>
 <th className="py-2.5 px-4">Previous Value</th>
 <th className="py-2.5 px-4">New Value</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100/60 text-neutral-700 font-bold">
 {settingsModifiedFields.map((change, idx) => (
 <tr key={idx} className="hover:bg-neutral-50/10">
 <td className="py-3 px-4 text-neutral-700">{change.field}</td>
 <td className="py-3 px-4 text-neutral-500 line-through truncate max-w-[120px]" title={change.oldVal}>{change.oldVal}</td>
 <td className="py-3 px-4 text-primary truncate max-w-[120px]" title={change.newVal}>{change.newVal}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 <div className="flex gap-3 pt-5 border-t border-neutral-100 mt-5">
 <button
 type="button"
 onClick={() => setSettingsReviewModalOpen(false)}
 className="flex-1 py-3 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-800 transition-all cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={confirmSettingsSaveSubmit}
 disabled={savingSettings}
 className="flex-1 py-3 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
 >
 {savingSettings ? <RefreshCw className="animate-spin" size={13} /> : <span>Confirm & Apply</span>}
 </button>
 </div>
 </div>
 </div>
 )}

 {settingsUnsavedWarningOpen && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background backdrop-blur-md animate-fade-in">
 <div className="fixed inset-0" onClick={() => setSettingsUnsavedWarningOpen(false)} />

 <div className="w-full max-w-sm bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-2xl relative z-10 animate-scale-up text-center">
 <AlertTriangle className="text-amber-700 mx-auto mb-3" size={36} />
 <h3 className="text-sm font-extrabold text-neutral-900">Unsaved Config Changes</h3>
 <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
 You have modified configuration fields that are not applied yet. Are you sure you want to discard your edits?
 </p>

 <div className="flex gap-3 pt-5 mt-3">
 <button
 type="button"
 onClick={() => setSettingsUnsavedWarningOpen(false)}
 className="flex-1 py-3 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 rounded-xl text-xs font-bold text-neutral-700"
 >
 Continue Editing
 </button>
 <button
 type="button"
 onClick={confirmSettingsDiscard}
 className="flex-1 py-3 bg-danger hover:bg-red-600 text-xs font-bold text-white rounded-xl shadow transition-all cursor-pointer"
 >
 Discard Edits
 </button>
 </div>
 </div>
 </div>
 )}

 {settingsSuccessModalOpen && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background backdrop-blur-md animate-fade-in">
 <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-3xl p-7 shadow-2xl text-center relative animate-scale-up">
 <div className="w-14 h-14 bg-success-light border border-green-200 rounded-2xl flex items-center justify-center mx-auto text-success mb-4 animate-bounce">
 <Check size={28} />
 </div>

 <h3 className="text-base font-extrabold text-neutral-900">Settings Updated Successfully</h3>
 <p className="text-xs text-neutral-600 mt-1.5">Global organization parameters have been applied and synced across all branches.</p>

 <div className="my-5 p-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-left text-[11px] space-y-2.5">
 <div className="flex justify-between">
 <span className="text-neutral-500">Updated By:</span>
 <span className="font-semibold text-neutral-700">Marcus Vance (Owner)</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Updated Time:</span>
 <span className="font-mono text-neutral-600">{new Date().toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Parameters Modified:</span>
 <span className="font-bold text-primary">{settingsModifiedFields.length}</span>
 </div>
 </div>

 <button
 type="button"
 onClick={() => {
 setSettingsSuccessModalOpen(false);
 loadData();
 }}
 className="w-full py-3 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
 >
 Continue Configuration
 </button>
 </div>
 </div>
 )}

 </div>
 );
}
