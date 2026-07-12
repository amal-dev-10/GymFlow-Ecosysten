'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
 Settings,
 Shield,
 Sliders,
 CheckSquare,
 AlertTriangle,
 Clock,
 QrCode,
 Users,
 Bell,
 Cpu,
 Lock,
 History,
 Play,
 Save,
 CheckCircle,
 XCircle,
 Building,
 RefreshCw,
 Info,
 Calendar,
 Layers,
 ChevronRight,
 TrendingUp,
 FileText
} from 'lucide-react';
import { gymApi, attendanceApi, rolesApi } from '../../../../lib/api';
import AttendanceTabs from '../AttendanceTabs';



function AttendanceSettingsContent() {
 const router = useRouter();

 // Basic Page States
 const [loading, setLoading] = useState(false);
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
 const [activeCategory, setActiveCategory] = useState<'general' | 'checkin' | 'checkout' | 'validation' | 'qr' | 'capacity' | 'notifications' | 'automation' | 'security' | 'permissions' | 'overrides' | 'history' | 'simulator'>('general');
 const [showImpactModal, setShowImpactModal] = useState(false);

 // --- SETTINGS STATE VARIABLES ---
 
 // General Attendance Settings
 const [trackingEnabled, setTrackingEnabled] = useState(true);
 const [timezone, setTimezone] = useState('America/New_York');
 const [startDay, setStartDay] = useState('Monday');
 const [calculationMethod, setCalculationMethod] = useState<'Check-In Only' | 'Check-In + Check-Out' | 'Session Based' | 'Visit Based'>('Check-In + Check-Out');

 // Check-In Settings
 const [allowManualCheckIn, setAllowManualCheckIn] = useState(true);
 const [allowQrCheckIn, setAllowQrCheckIn] = useState(true);
 const [allowBarcodeCheckIn, setAllowBarcodeCheckIn] = useState(true);
 const [allowMobileCheckIn, setAllowMobileCheckIn] = useState(true);
 const [allowGuestCheckIn, setAllowGuestCheckIn] = useState(true);
 const [allowFingerprintCheckIn, setAllowFingerprintCheckIn] = useState(true);
 const [allowRfidCheckIn, setAllowRfidCheckIn] = useState(true);
 const [allowFaceCheckIn, setAllowFaceCheckIn] = useState(true);
 const [allowKiosk, setAllowKiosk] = useState(true);

 // Check-In Restrictions
 const [earliestCheckIn, setEarliestCheckIn] = useState('05:00');
 const [latestCheckIn, setLatestCheckIn] = useState('23:00');
 const [maxDailyCheckIns, setMaxDailyCheckIns] = useState(3);
 const [duplicatePrevention, setDuplicatePrevention] = useState(true);
 const [minGap, setMinGap] = useState(30); // minutes

 // Check-Out Settings
 const [requireCheckOut, setRequireCheckOut] = useState(true);
 const [allowAutoCheckOut, setAllowAutoCheckOut] = useState(true);
 const [allowManualCheckOut, setAllowManualCheckOut] = useState(true);
 const [historyRetention, setHistoryRetention] = useState(365); // days

 const [activeBranchId, setActiveBranchId] = useState('');
 const [branches, setBranches] = useState<any[]>([]);

 useEffect(() => {
 const loadBranches = async () => {
 const orgId = localStorage.getItem('organizationId');
 if (!orgId) return;
 try {
 const data = await gymApi.list(orgId);
 setBranches(data || []);
 if (data && data.length > 0) {
 setActiveBranchId(data[0].id);
 }
 } catch (err) {
 console.error('Failed to load branches', err);
 }
 };
 loadBranches();
 }, []);

 const [autoCloseSessions, setAutoCloseSessions] = useState(true);
 const [allowGracePeriod, setAllowGracePeriod] = useState(false);
 const [gracePeriodDays, setGracePeriodDays] = useState(3); // days after membership expiry
 const [branchClosingTime, setBranchClosingTime] = useState('22:00');
 const [autoCheckOutBuffer, setAutoCheckOutBuffer] = useState(15); // minutes after close
 const [maxSessionDuration, setMaxSessionDuration] = useState(180); // minutes

 // Membership Validation Settings
 const [validateStatus, setValidateStatus] = useState(true);
 const [validateExpiry, setValidateExpiry] = useState(true);
 const [validateBranchAccess, setValidateBranchAccess] = useState(true);
 const [validateVisitLimits, setValidateVisitLimits] = useState(true);
 const [validateFreeze, setValidateFreeze] = useState(true);
 const [validateSuspension, setValidateSuspension] = useState(true);
 const [financialValidation, setFinancialValidation] = useState<'ignore' | 'warn' | 'block'>('block');

 // Branch Access Rules
 const [singleBranchValidation, setSingleBranchValidation] = useState(false);
 const [multiBranchValidation, setMultiBranchValidation] = useState(true);
 const [tempAccessValidation, setTempAccessValidation] = useState(true);
 const [transferValidation, setTransferValidation] = useState(true);
 const [crossBranchPolicy, setCrossBranchPolicy] = useState('Restricted');

 // Visit Limits
 const [dailyLimit, setDailyLimit] = useState(1);
 const [weeklyLimit, setWeeklyLimit] = useState(6);
 const [monthlyLimit, setMonthlyLimit] = useState(25);
 const [lifetimeLimit, setLifetimeLimit] = useState(9999);

 // QR Attendance Settings
 const [enableQrAttendance, setEnableQrAttendance] = useState(true);
 const [dynamicQr, setDynamicQr] = useState(true);
 const [qrExpiryTime, setQrExpiryTime] = useState(15); // seconds
 const [qrRefreshInterval, setQrRefreshInterval] = useState(10); // seconds
 const [qrSecurityMode, setQrSecurityMode] = useState<'Standard' | 'High' | 'Strict'>('High');
 const [guestQrAccess, setGuestQrAccess] = useState(true);
 const [tokenExpiry, setTokenExpiry] = useState(30); // seconds
 const [deviceValidation, setDeviceValidation] = useState(true);
 const [geoRestriction, setGeoRestriction] = useState(false);
 const [branchRestriction, setBranchRestriction] = useState(true);
 const [duplicateScanPrevention, setDuplicateScanPrevention] = useState(true);

 // Capacity Management Settings
 const [maxCapacity, setMaxCapacity] = useState(150);
 const [warningThreshold, setWarningThreshold] = useState(80); // %
 const [criticalThreshold, setCriticalThreshold] = useState(90); // %
 const [overCapacityAllowed, setOverCapacityAllowed] = useState(false);
 const [emergencyCapacity, setEmergencyCapacity] = useState(180);

 // Notification Settings
 const [notifyCheckIn, setNotifyCheckIn] = useState(true);
 const [notifyCheckOut, setNotifyCheckOut] = useState(true);
 const [notifyDenied, setNotifyDenied] = useState(true);
 const [notifyCapacity, setNotifyCapacity] = useState(true);
 const [notifyExpiry, setNotifyExpiry] = useState(true);
 const [notifyMilestones, setNotifyMilestones] = useState(true);
 const [notifyInactive, setNotifyInactive] = useState(false);
 const [channelInApp, setChannelInApp] = useState(true);
 const [channelSms, setChannelSms] = useState(false);
 const [channelEmail, setChannelEmail] = useState(true);

 // Attendance Automation Settings
 const [autoExpiryValidation, setAutoExpiryValidation] = useState(true);
 const [autoCheckOutAuto, setAutoCheckOutAuto] = useState(true);
 const [attendanceCleanup, setAttendanceCleanup] = useState(true);
 const [inactiveMemberDetection, setInactiveMemberDetection] = useState(true);
 const [reminderRules, setReminderRules] = useState(true);

 // Attendance Correction Settings
 const [allowCorrections, setAllowCorrections] = useState(true);
 const [correctionApprovalRequired, setCorrectionApprovalRequired] = useState(true);
 const [correctionWindow, setCorrectionWindow] = useState(48); // hours
 const [correctionReasonMandatory, setCorrectionReasonMandatory] = useState(true);

 // Security & Audit settings
 const [allowManualOverride, setAllowManualOverride] = useState(true);
 const [whoCanOverride, setWhoCanOverride] = useState('Owner & Manager');
 const [overrideApprovalRequired, setOverrideApprovalRequired] = useState(true);
 const [overrideReasonRequired, setOverrideReasonRequired] = useState(true);
 const [auditLogEnabled, setAuditLogEnabled] = useState(true);
 const [logRetentionPeriod, setLogRetentionPeriod] = useState(90); // days
 // Permissions Matrix
 const [permissionsMatrix, setPermissionsMatrix] = useState([
 { role: 'Owner', view: 'Full', checkin: 'Full', edit: 'Full', override: 'Full', export: 'Full' },
 { role: 'Manager', view: 'Full', checkin: 'Full', edit: 'Limited', override: 'Full', export: 'Full' },
 { role: 'Branch Manager', view: 'Full', checkin: 'Full', edit: 'Branch Only', override: 'Full', export: 'Full' },
 { role: 'Receptionist', view: 'Full', checkin: 'Full', edit: 'None', override: 'Limited', export: 'Limited' },
 { role: 'Trainer', view: 'Limited', checkin: 'None', edit: 'None', override: 'None', export: 'None' },
 { role: 'Dietitian', view: 'View Only', checkin: 'None', edit: 'None', override: 'None', export: 'None' },
 { role: 'Member', view: 'Own Only', checkin: 'Own Only', edit: 'None', override: 'None', export: 'None' },
 ]);

 // Branch Overrides
 const [branchOverrides, setBranchOverrides] = useState([
 { id: 'br-1', name: 'Downtown Headquarters', capacity: 200, checkInHours: '05:00 - 23:00', overrides: 3 },
 { id: 'br-2', name: 'Northside Express (24/7)', capacity: 80, checkInHours: '00:00 - 24:00', overrides: 5 },
 { id: 'br-3', name: 'West End Wellness', capacity: 120, checkInHours: '06:00 - 21:00', overrides: 1 }
 ]);

 // Plan Overrides
 const [planOverrides, setPlanOverrides] = useState([
 { id: 'pl-1', name: 'Off-Peak Membership', maxCheckIns: 1, allowedHours: '09:00 - 15:00', crossBranch: 'Blocked' },
 { id: 'pl-2', name: 'Weekend Only Special', maxCheckIns: 2, allowedHours: 'Saturday & Sunday', crossBranch: 'Allowed' },
 { id: 'pl-3', name: 'Corporate Platinum VIP', maxCheckIns: 5, allowedHours: 'Anytime', crossBranch: 'Unlimited' }
 ]);

 // History Log - real audit trail entries (eventCategory: 'attendance'), not mock data
 const [historyLog, setHistoryLog] = useState<{ id: string; action: string; user: string; details: string; timestamp: string }[]>([]);
 const [historyLoading, setHistoryLoading] = useState(false);

 const fetchHistory = async () => {
 try {
 setHistoryLoading(true);
 const logs = await rolesApi.getAuditLogs('attendance');
 setHistoryLog(logs || []);
 } catch (err) {
 console.error('Failed to load attendance settings history', err);
 } finally {
 setHistoryLoading(false);
 }
 };

 const showToastMsg = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 // Load Settings
 useEffect(() => {
 if (activeBranchId) {
 attendanceApi.getSettings(activeBranchId).then(settings => {
 if (!settings) return;
 if (settings.duplicateScanPrevention !== undefined) setDuplicateScanPrevention(settings.duplicateScanPrevention);
 if (settings.financialValidation !== undefined) setFinancialValidation(settings.financialValidation);
 if (settings.maxCapacity !== undefined) setMaxCapacity(settings.maxCapacity);
 if (settings.validateExpiry !== undefined) setValidateExpiry(settings.validateExpiry);
 if (settings.validateFreeze !== undefined) setValidateFreeze(settings.validateFreeze);
 if (settings.allowGracePeriod !== undefined) setAllowGracePeriod(settings.allowGracePeriod);
 if (settings.gracePeriodDays !== undefined) setGracePeriodDays(settings.gracePeriodDays);
 if (settings.autoCloseSessions !== undefined) setAutoCloseSessions(settings.autoCloseSessions);

 // General Settings
 if (settings.trackingEnabled !== undefined) setTrackingEnabled(settings.trackingEnabled);
 if (settings.timezone !== undefined) setTimezone(settings.timezone);
 if (settings.startDay !== undefined) setStartDay(settings.startDay);
 if (settings.calculationMethod !== undefined) setCalculationMethod(settings.calculationMethod);

 // Check-in Methods
 if (settings.allowManualCheckIn !== undefined) setAllowManualCheckIn(settings.allowManualCheckIn);
 if (settings.allowQrCheckIn !== undefined) setAllowQrCheckIn(settings.allowQrCheckIn);
 if (settings.allowBarcodeCheckIn !== undefined) setAllowBarcodeCheckIn(settings.allowBarcodeCheckIn);
 if (settings.allowMobileCheckIn !== undefined) setAllowMobileCheckIn(settings.allowMobileCheckIn);
 if (settings.allowGuestCheckIn !== undefined) setAllowGuestCheckIn(settings.allowGuestCheckIn);
 if (settings.allowFingerprintCheckIn !== undefined) setAllowFingerprintCheckIn(settings.allowFingerprintCheckIn);
 if (settings.allowRfidCheckIn !== undefined) setAllowRfidCheckIn(settings.allowRfidCheckIn);
 if (settings.allowFaceCheckIn !== undefined) setAllowFaceCheckIn(settings.allowFaceCheckIn);
 if (settings.allowKiosk !== undefined) setAllowKiosk(settings.allowKiosk);

 // Check-in Restrictions
 if (settings.earliestCheckIn !== undefined) setEarliestCheckIn(settings.earliestCheckIn);
 if (settings.latestCheckIn !== undefined) setLatestCheckIn(settings.latestCheckIn);
 if (settings.maxDailyCheckIns !== undefined) setMaxDailyCheckIns(settings.maxDailyCheckIns);
 if (settings.duplicatePrevention !== undefined) setDuplicatePrevention(settings.duplicatePrevention);
 if (settings.minGap !== undefined) setMinGap(settings.minGap);

 // Check-Out Policies
 if (settings.requireCheckOut !== undefined) setRequireCheckOut(settings.requireCheckOut);
 if (settings.branchClosingTime !== undefined) setBranchClosingTime(settings.branchClosingTime);
 if (settings.autoCheckOutBuffer !== undefined) setAutoCheckOutBuffer(settings.autoCheckOutBuffer);
 if (settings.maxSessionDuration !== undefined) setMaxSessionDuration(settings.maxSessionDuration);

 // Membership & Financial Validation
 if (settings.validateStatus !== undefined) setValidateStatus(settings.validateStatus);
 if (settings.validateBranchAccess !== undefined) setValidateBranchAccess(settings.validateBranchAccess);
 if (settings.validateVisitLimits !== undefined) setValidateVisitLimits(settings.validateVisitLimits);
 if (settings.validateSuspension !== undefined) setValidateSuspension(settings.validateSuspension);

 // QR Attendance Security
 if (settings.dynamicQr !== undefined) setDynamicQr(settings.dynamicQr);
 if (settings.qrRefreshInterval !== undefined) setQrRefreshInterval(settings.qrRefreshInterval);
 if (settings.qrSecurityMode !== undefined) setQrSecurityMode(settings.qrSecurityMode);
 if (settings.deviceValidation !== undefined) setDeviceValidation(settings.deviceValidation);
 if (settings.tokenExpiry !== undefined) setTokenExpiry(settings.tokenExpiry);

 // Capacity Management
 if (settings.warningThreshold !== undefined) setWarningThreshold(settings.warningThreshold);
 if (settings.criticalThreshold !== undefined) setCriticalThreshold(settings.criticalThreshold);
 if (settings.emergencyCapacity !== undefined) setEmergencyCapacity(settings.emergencyCapacity);

 // Notifications & Channels
 if (settings.notifyCheckIn !== undefined) setNotifyCheckIn(settings.notifyCheckIn);
 if (settings.notifyCheckOut !== undefined) setNotifyCheckOut(settings.notifyCheckOut);
 if (settings.notifyDenied !== undefined) setNotifyDenied(settings.notifyDenied);
 if (settings.notifyCapacity !== undefined) setNotifyCapacity(settings.notifyCapacity);
 if (settings.notifyExpiry !== undefined) setNotifyExpiry(settings.notifyExpiry);
 if (settings.notifyMilestones !== undefined) setNotifyMilestones(settings.notifyMilestones);
 if (settings.channelInApp !== undefined) setChannelInApp(settings.channelInApp);
 if (settings.channelSms !== undefined) setChannelSms(settings.channelSms);
 if (settings.channelEmail !== undefined) setChannelEmail(settings.channelEmail);

 // Automation
 if (settings.autoExpiryValidation !== undefined) setAutoExpiryValidation(settings.autoExpiryValidation);
 if (settings.autoCheckOutAuto !== undefined) setAutoCheckOutAuto(settings.autoCheckOutAuto);
 if (settings.attendanceCleanup !== undefined) setAttendanceCleanup(settings.attendanceCleanup);
 if (settings.inactiveMemberDetection !== undefined) setInactiveMemberDetection(settings.inactiveMemberDetection);

 // Security & Manual Override
 if (settings.allowManualOverride !== undefined) setAllowManualOverride(settings.allowManualOverride);
 if (settings.whoCanOverride !== undefined) setWhoCanOverride(settings.whoCanOverride);
 if (settings.logRetentionPeriod !== undefined) setLogRetentionPeriod(settings.logRetentionPeriod);
 }).catch(err => console.error("Failed to load attendance settings", err));
 }
 }, [activeBranchId]);

 useEffect(() => {
 fetchHistory();
 }, []);

 const handlePermissionChange = (roleIndex: number, field: string, value: string) => {
 const copy = [...permissionsMatrix];
 copy[roleIndex] = { ...copy[roleIndex], [field]: value };
 setPermissionsMatrix(copy);
 };

 // Run Simulator

 // Save Settings
 const saveAllSettings = async () => {
 setShowImpactModal(false);
 setLoading(true);
 try {
 const payload = {
 // Validation Rules
 duplicateScanPrevention,
 financialValidation,
 maxCapacity,
 validateExpiry,
 validateFreeze,
 allowGracePeriod,
 gracePeriodDays,
 autoCloseSessions,
 // General Settings
 trackingEnabled,
 timezone,
 startDay,
 calculationMethod,
 // Check-in Methods
 allowManualCheckIn,
 allowQrCheckIn,
 allowBarcodeCheckIn,
 allowMobileCheckIn,
 allowGuestCheckIn,
 allowFingerprintCheckIn,
 allowRfidCheckIn,
 allowFaceCheckIn,
 allowKiosk,
 // Check-in Restrictions
 earliestCheckIn,
 latestCheckIn,
 maxDailyCheckIns,
 duplicatePrevention,
 minGap,
 // Check-Out Policies
 requireCheckOut,
 branchClosingTime,
 autoCheckOutBuffer,
 maxSessionDuration,
 // Membership & Financial Validation
 validateStatus,
 validateBranchAccess,
 validateVisitLimits,
 validateSuspension,
 // QR Attendance Security
 dynamicQr,
 qrRefreshInterval,
 qrSecurityMode,
 deviceValidation,
 tokenExpiry,
 // Capacity Management
 warningThreshold,
 criticalThreshold,
 // Critical threshold IS the actual block point checkIn() enforces
 // (validateCheckIn reads settings.maxOccupancyPercent, not criticalThreshold).
 maxOccupancyPercent: criticalThreshold,
 emergencyCapacity,
 // Notifications & Channels
 notifyCheckIn,
 notifyCheckOut,
 notifyDenied,
 notifyCapacity,
 notifyExpiry,
 notifyMilestones,
 channelInApp,
 channelSms,
 channelEmail,
 // Automation
 autoExpiryValidation,
 autoCheckOutAuto,
 attendanceCleanup,
 inactiveMemberDetection,
 // Security & Manual Override
 allowManualOverride,
 whoCanOverride,
 logRetentionPeriod,
 };
 await attendanceApi.updateSettings(activeBranchId, payload);

 const branchName = branches.find(b => b.id === activeBranchId)?.name || activeBranchId;
 await rolesApi.createAuditLog({
 action: 'Attendance Settings Updated',
 details: `Attendance configuration saved for ${branchName}.`,
 eventType: 'SETTINGS_UPDATED',
 eventCategory: 'attendance',
 }).catch(() => {});
 await fetchHistory();

 showToastMsg('Attendance settings updated successfully!', 'success');
 } catch (err: any) {
 showToastMsg(err.response?.data?.message || 'Failed to update settings', 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="p-6 max-w-[1600px] mx-auto space-y-6 text-neutral-900 min-h-screen bg-background">
 {/* Toast Alert */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-xs shadow-2xl transition-all duration-300 transform translate-y-0 ${
 toast.type === 'success' ? 'bg-success-light border-green-200 text-success' : 
 toast.type === 'warning' ? 'bg-warning-light border-amber-200 text-amber-700' :
 'bg-danger-light border-red-200 text-danger'
 }`}>
 {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
 <span>{toast.message}</span>
 </div>
 )}

 {/* Header */}
 <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-neutral-100 pb-5">
 <div>
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold bg-primary-light text-primary px-2.5 py-1 rounded-full uppercase tracking-wider">Settings & Rules</span>
 <span className="text-xs font-bold bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full">Owner Access</span>
 </div>
 <h1 className="text-2xl font-black tracking-tight text-neutral-900 mt-1">Attendance Configuration</h1>
 <p className="text-neutral-600 text-xs mt-0.5">Configure access rules, check-in limits, role permissions, and branch overrides organization-wide.</p>
 </div>
 <div className="flex items-center gap-3 self-end md:self-center">
 {branches.length > 1 && (
 <select
 value={activeBranchId}
 onChange={(e) => setActiveBranchId(e.target.value)}
 className="bg-background border border-neutral-100 rounded-xl px-3 py-2 text-xs text-neutral-800 focus:outline-none"
 >
 {branches.map((b) => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 )}
 <button
 onClick={() => setShowImpactModal(true)}
 disabled={!activeBranchId}
 className="flex items-center gap-2 bg-primary hover:bg-primary-hover px-4 py-2 rounded-xl text-xs font-black text-white transition shadow-sm disabled:opacity-50"
 >
 {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
 <span>Save Settings</span>
 </button>
 </div>
 </div>

 {/* Tabs list navigation */}
 <AttendanceTabs />

 {/* Dashboard KPI Mini-Summary Cards */}
 <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
 {[
 { label: 'Active Check-In Rules', val: '14 Active', color: 'border-primary/20 text-primary', icon: CheckSquare },
 { label: 'Automation Rules', val: '4 Active', color: 'border-indigo-200 text-indigo-500', icon: Cpu },
 { label: 'Notification Channels', val: '2 Enabled', color: 'border-amber-200 text-amber-700', icon: Bell },
 { label: 'Capacity Settings', val: '3 Branches', color: 'border-green-200 text-success', icon: Building },
 { label: 'QR Scan Devices', val: '18 Paired', color: 'border-purple-500/20 text-purple-400', icon: QrCode },
 { label: 'Rule Exceptions', val: '3 Overrides', color: 'border-neutral-200 text-neutral-700', icon: Sliders }
 ].map((kpi, idx) => (
 <div key={idx} className="bg-white border border-neutral-100 p-4 rounded-2xl flex flex-col justify-between hover:border-neutral-200 transition">
 <div className="flex justify-between items-start">
 <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block leading-tight">{kpi.label}</span>
 <kpi.icon className="w-3.5 h-3.5 text-neutral-400" />
 </div>
 <div className="mt-3">
 <span className={`text-base font-black ${kpi.color}`}>{kpi.val}</span>
 </div>
 </div>
 ))}
 </div>

 {/* Main Settings Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
 
 {/* Sidebar Nav */}
 <div className="lg:col-span-1 space-y-1">
 {[
 { id: 'general', label: 'General Settings', icon: Settings },
 { id: 'checkin', label: 'Check-In & Restrictions', icon: Sliders },
 { id: 'checkout', label: 'Check-Out Policies', icon: Clock },
 { id: 'validation', label: 'Membership & Finance', icon: Shield },
 { id: 'qr', label: 'QR Attendance Rules', icon: QrCode },
 { id: 'capacity', label: 'Capacity Management', icon: Users },
 { id: 'notifications', label: 'Notifications & Alerts', icon: Bell },
 { id: 'automation', label: 'Automations & Cleanup', icon: Cpu },
 { id: 'security', label: 'Security & Manual Override', icon: Lock },
 { id: 'permissions', label: 'Role Permissions Matrix', icon: CheckSquare },
 { id: 'overrides', label: 'Branch & Plan Overrides', icon: Layers },
 { id: 'history', label: 'Change History Logs', icon: History }
 ].map((cat) => {
 const Icon = cat.icon;
 const isSelected = activeCategory === cat.id;
 return (
 <button
 key={cat.id}
 onClick={() => setActiveCategory(cat.id as any)}
 className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-xs font-bold transition ${
 isSelected
 ? 'bg-primary-light text-primary border-l-2 border-primary font-black'
 : 'text-neutral-600 hover:bg-white hover:text-neutral-900'
 }`}
 >
 <div className="flex items-center gap-3">
 <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-neutral-500'}`} />
 <span>{cat.label}</span>
 </div>
 <ChevronRight className="w-3.5 h-3.5 opacity-50" />
 </button>
 );
 })}
 </div>

 {/* Content Pane */}
 <div className="lg:col-span-3 bg-white border border-neutral-100 p-6 rounded-2xl space-y-6">
 
 {/* GENERAL SETTINGS */}
 {activeCategory === 'general' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">General Attendance Settings</h3>
 <p className="text-neutral-600 text-xs mt-0.5">Adjust organization-wide global attendance parameters.</p>
 </div>

 <div className="space-y-4">
 <div className="flex items-center justify-between p-4 bg-background border border-neutral-100 rounded-xl">
 <div>
 <span className="text-xs font-black text-neutral-800 block">Attendance Tracking Enabled</span>
 <span className="text-[10px] text-neutral-500">Allow members to log check-ins or entries in the system.</span>
 </div>
 <input 
 type="checkbox" 
 checked={trackingEnabled}
 onChange={(e) => setTrackingEnabled(e.target.checked)}
 className="w-4 h-4 rounded text-primary accent-primary bg-neutral-50 border-neutral-200"
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="space-y-1.5">
 <label className="text-[10px] font-black text-neutral-600 uppercase tracking-wider">Attendance Timezone</label>
 <select 
 value={timezone}
 onChange={(e) => setTimezone(e.target.value)}
 className="w-full bg-background border border-neutral-100 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light"
 >
 <option value="America/New_York">Eastern Time (EST)</option>
 <option value="America/Los_Angeles">Pacific Time (PST)</option>
 <option value="Europe/London">London (GMT)</option>
 <option value="Asia/Kolkata">Kolkata (IST)</option>
 </select>
 </div>

 <div className="space-y-1.5">
 <label className="text-[10px] font-black text-neutral-600 uppercase tracking-wider">Start Day of Week</label>
 <select 
 value={startDay}
 onChange={(e) => setStartDay(e.target.value)}
 className="w-full bg-background border border-neutral-100 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light"
 >
 <option value="Monday">Monday</option>
 <option value="Sunday">Sunday</option>
 </select>
 </div>

 <div className="space-y-1.5">
 <label className="text-[10px] font-black text-neutral-600 uppercase tracking-wider">Calculation Method</label>
 <select 
 value={calculationMethod}
 onChange={(e) => setCalculationMethod(e.target.value as any)}
 className="w-full bg-background border border-neutral-100 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light"
 >
 <option value="Check-In Only">Check-In Only (Simple Log)</option>
 <option value="Check-In + Check-Out">Check-In + Check-Out (Occupancy Tracking)</option>
 <option value="Session Based">Session Based (Class logs)</option>
 <option value="Visit Based">Visit Based (Counted limits)</option>
 </select>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* CHECK-IN SETTINGS & RESTRICTIONS */}
 {activeCategory === 'checkin' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Check-In Settings & Restrictions</h3>
 <p className="text-neutral-600 text-xs mt-0.5">Determine how members check in and check-in validation limits.</p>
 </div>

 <div className="space-y-4">
 <span className="text-[10px] font-black text-neutral-600 uppercase tracking-wider block">Allowed Check-In Channels</span>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
 {[
 { label: 'Allow Manual Lookup Check-In', state: allowManualCheckIn, set: setAllowManualCheckIn },
 { label: 'Allow QR Code Scan', state: allowQrCheckIn, set: setAllowQrCheckIn },
 { label: 'Allow Barcode Cards', state: allowBarcodeCheckIn, set: setAllowBarcodeCheckIn },
 { label: 'Allow Mobile App Check-In', state: allowMobileCheckIn, set: setAllowMobileCheckIn },
 { label: 'Allow Guest Access Passes', state: allowGuestCheckIn, set: setAllowGuestCheckIn },
 { label: 'Allow Fingerprint Biometrics', state: allowFingerprintCheckIn, set: setAllowFingerprintCheckIn },
 { label: 'Allow RFID Scanner Keys', state: allowRfidCheckIn, set: setAllowRfidCheckIn },
 { label: 'Allow Facial Recognition Scan', state: allowFaceCheckIn, set: setAllowFaceCheckIn },
 { label: 'Self-Service Kiosk Mode', state: allowKiosk, set: setAllowKiosk },
 ].map((chan, idx) => (
 <div key={idx} className="flex items-center justify-between p-3.5 bg-background border border-neutral-100 rounded-xl">
 <span className="text-xs text-neutral-700 font-semibold">{chan.label}</span>
 <input 
 type="checkbox" 
 checked={chan.state}
 onChange={(e) => chan.set(e.target.checked)}
 className="w-4 h-4 rounded text-primary accent-primary bg-neutral-50 border-neutral-200"
 />
 </div>
 ))}
 </div>

 <div className="border-t border-neutral-100/60 pt-4 space-y-4">
 <span className="text-[10px] font-black text-neutral-600 uppercase tracking-wider block">Check-In Schedule & Limit Controls</span>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600">Earliest Check-In Time Allowed</label>
 <input 
 type="time" 
 value={earliestCheckIn} 
 onChange={(e) => setEarliestCheckIn(e.target.value)}
 className="w-full bg-background border border-neutral-100 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light"
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600">Latest Check-In Time Allowed</label>
 <input 
 type="time" 
 value={latestCheckIn} 
 onChange={(e) => setLatestCheckIn(e.target.value)}
 className="w-full bg-background border border-neutral-100 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600">Max Daily Check-Ins</label>
 <input 
 type="number" 
 value={maxDailyCheckIns} 
 onChange={(e) => setMaxDailyCheckIns(parseInt(e.target.value) || 1)}
 className="w-full bg-background border border-neutral-100 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light"
 />
 </div>
 
 <div className="md:col-span-2 flex items-center justify-between p-3.5 bg-background border border-neutral-100 rounded-xl self-end">
 <div>
 <span className="text-xs font-black text-neutral-800 block">Prevent Duplicate Scan Checks</span>
 <span className="text-[10px] text-neutral-500">Wait interval between scans.</span>
 </div>
 <div className="flex items-center gap-3">
 {duplicatePrevention && (
 <input 
 type="number" 
 value={minGap} 
 onChange={(e) => setMinGap(parseInt(e.target.value) || 0)}
 className="w-20 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs text-neutral-800 text-center"
 placeholder="Mins"
 />
 )}
 <input 
 type="checkbox" 
 checked={duplicatePrevention}
 onChange={(e) => setDuplicatePrevention(e.target.checked)}
 className="w-4 h-4 rounded text-primary accent-primary bg-neutral-50 border-neutral-200"
 />
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* CHECK-OUT SETTINGS */}
 {activeCategory === 'checkout' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Check-Out Policies</h3>
 <p className="text-neutral-600 text-xs mt-0.5">Configure system policies for session check-outs and auto-closures.</p>
 </div>

 <div className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="flex items-center justify-between p-4 bg-background border border-neutral-100 rounded-xl">
 <div>
 <span className="text-xs font-black text-neutral-800 block">Require Exit Check-Out</span>
 <span className="text-[10px] text-neutral-500">Validate member checkout to record duration.</span>
 </div>
 <input 
 type="checkbox" 
 checked={requireCheckOut}
 onChange={(e) => setRequireCheckOut(e.target.checked)}
 className="w-4 h-4 rounded text-primary accent-primary bg-neutral-50 border-neutral-200"
 />
 </div>

 <div className="flex items-center justify-between p-4 bg-background border border-neutral-100 rounded-xl">
 <div>
 <span className="text-xs font-black text-neutral-800 block">Auto Close Sessions</span>
 <span className="text-[10px] text-neutral-500">Automatically end sessions after buffer.</span>
 </div>
 <input 
 type="checkbox" 
 checked={autoCloseSessions}
 onChange={(e) => setAutoCloseSessions(e.target.checked)}
 className="w-4 h-4 rounded text-primary accent-primary bg-neutral-50 border-neutral-200"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600">Max Session Duration (mins)</label>
 <input 
 type="number" 
 value={maxSessionDuration} 
 onChange={(e) => setMaxSessionDuration(parseInt(e.target.value) || 0)}
 className="w-full bg-background border border-neutral-100 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600">Closing Auto-Checkout Time</label>
 <input 
 type="time" 
 value={branchClosingTime} 
 onChange={(e) => setBranchClosingTime(e.target.value)}
 className="w-full bg-background border border-neutral-100 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600">Closing Buffer (mins)</label>
 <input 
 type="number" 
 value={autoCheckOutBuffer} 
 onChange={(e) => setAutoCheckOutBuffer(parseInt(e.target.value) || 0)}
 className="w-full bg-background border border-neutral-100 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none"
 />
 </div>
 </div>
 </div>
 </div>
 )}

 {/* MEMBERSHIP & FINANCIAL VALIDATION */}
 {activeCategory === 'validation' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Membership & Financial Validation</h3>
 <p className="text-neutral-600 text-xs mt-0.5">Determine access blocking rules based on membership status and bills.</p>
 </div>

 <div className="space-y-4">
 <span className="text-[10px] font-black text-neutral-600 uppercase tracking-wider block">Access Checks</span>
 <div className="grid grid-cols-2 gap-4">
 {[
 { label: 'Validate Account Status', state: validateStatus, set: setValidateStatus },
 { label: 'Block Expired Memberships', state: validateExpiry, set: setValidateExpiry },
 { label: 'Validate Branch Permissions', state: validateBranchAccess, set: setValidateBranchAccess },
 { label: 'Validate Plan Visit Limits', state: validateVisitLimits, set: setValidateVisitLimits },
 { label: 'Check Frozen status', state: validateFreeze, set: setValidateFreeze },
 { label: 'Check Suspension status', state: validateSuspension, set: setValidateSuspension },
 ].map((chk, idx) => (
 <div key={idx} className="flex items-center justify-between p-3.5 bg-background border border-neutral-100 rounded-xl">
 <span className="text-xs text-neutral-700 font-semibold">{chk.label}</span>
 <input 
 type="checkbox" 
 checked={chk.state}
 onChange={(e) => chk.set(e.target.checked)}
 className="w-4 h-4 rounded text-primary accent-primary bg-neutral-50 border-neutral-200"
 />
 </div>
 ))}
 </div>

 <div className="border-t border-neutral-100/60 pt-4 space-y-3">
 <span className="text-[10px] font-black text-neutral-600 uppercase tracking-wider block">Grace Period After Expiry</span>
 <div className="flex items-center justify-between p-3.5 bg-background border border-neutral-100 rounded-xl">
 <div>
 <span className="text-xs text-neutral-700 font-semibold block">Allow Grace Period</span>
 <span className="text-[10px] text-neutral-500">Treat check-ins as a Warning (not a Denial) for a few days after a membership expires.</span>
 </div>
 <input
 type="checkbox"
 checked={allowGracePeriod}
 onChange={(e) => setAllowGracePeriod(e.target.checked)}
 className="w-4 h-4 rounded text-primary accent-primary bg-neutral-50 border-neutral-200"
 />
 </div>
 {allowGracePeriod && (
 <div className="space-y-1 max-w-xs">
 <label className="text-[10px] text-neutral-600">Grace Period Length (days)</label>
 <input
 type="number"
 min={1}
 value={gracePeriodDays}
 onChange={(e) => setGracePeriodDays(parseInt(e.target.value) || 1)}
 className="w-full bg-background border border-neutral-100 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none"
 />
 </div>
 )}
 </div>

 <div className="border-t border-neutral-100/60 pt-4 space-y-3">
 <span className="text-[10px] font-black text-neutral-600 uppercase tracking-wider block">Financial Dues Policy</span>
 
 <div className="flex flex-col md:flex-row gap-3">
 {[
 { id: 'ignore', title: 'Ignore Outstanding Dues', desc: 'Allow entry regardless of billing status' },
 { id: 'warn', title: 'Warn & Alert Only', desc: 'Display visual alert to staff but grant entry' },
 { id: 'block', title: 'Block Entry at Scanner', desc: 'Deny scanning access until dues are paid' }
 ].map((opt) => (
 <button
 key={opt.id}
 onClick={() => setFinancialValidation(opt.id as any)}
 className={`flex-1 text-left p-4 rounded-xl border transition flex flex-col justify-between space-y-2 ${
 financialValidation === opt.id
 ? 'bg-primary-light border-primary/30 text-primary font-bold'
 : 'bg-background border-neutral-100 hover:border-neutral-200 text-neutral-700'
 }`}
 >
 <span className="text-xs">{opt.title}</span>
 <span className="text-[10px] text-neutral-500 font-normal">{opt.desc}</span>
 </button>
 ))}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* QR ATTENDANCE SETTINGS */}
 {activeCategory === 'qr' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">QR Attendance Security</h3>
 <p className="text-neutral-600 text-xs mt-0.5">Control token parameters for QR scans, device validation, and anti-sharing locks.</p>
 </div>

 <div className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="flex items-center justify-between p-4 bg-background border border-neutral-100 rounded-xl">
 <div>
 <span className="text-xs font-black text-neutral-800 block">Dynamic QR Generation</span>
 <span className="text-[10px] text-neutral-500">QR code updates periodically on mobile app.</span>
 </div>
 <input 
 type="checkbox" 
 checked={dynamicQr}
 onChange={(e) => setDynamicQr(e.target.checked)}
 className="w-4 h-4 rounded text-primary accent-primary bg-neutral-50 border-neutral-200"
 />
 </div>

 <div className="flex items-center justify-between p-4 bg-background border border-neutral-100 rounded-xl">
 <div>
 <span className="text-xs font-black text-neutral-800 block">Device-Specific Validation</span>
 <span className="text-[10px] text-neutral-500">Link scans to validated branch terminals.</span>
 </div>
 <input 
 type="checkbox" 
 checked={deviceValidation}
 onChange={(e) => setDeviceValidation(e.target.checked)}
 className="w-4 h-4 rounded text-primary accent-primary bg-neutral-50 border-neutral-200"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600">QR Refresh Interval (secs)</label>
 <input 
 type="number" 
 value={qrRefreshInterval} 
 onChange={(e) => setQrRefreshInterval(parseInt(e.target.value) || 10)}
 className="w-full bg-background border border-neutral-100 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none"
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600">Token Validation Expiry (secs)</label>
 <input 
 type="number" 
 value={tokenExpiry} 
 onChange={(e) => setTokenExpiry(parseInt(e.target.value) || 30)}
 className="w-full bg-background border border-neutral-100 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none"
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600">QR Security Mode</label>
 <select
 value={qrSecurityMode}
 onChange={(e) => setQrSecurityMode(e.target.value as any)}
 className="w-full bg-background border border-neutral-100 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none"
 >
 <option value="Standard">Standard (Fast scans)</option>
 <option value="High">High (Encrypted token updates)</option>
 <option value="Strict">Strict (Device binding + GPS)</option>
 </select>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* CAPACITY MANAGEMENT SETTINGS */}
 {activeCategory === 'capacity' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Branch Capacity & Occupancy Rules</h3>
 <p className="text-neutral-600 text-xs mt-0.5">Establish safety limitations and overflow thresholds per branch.</p>
 </div>

 <div className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600">Maximum Branch Capacity</label>
 <input 
 type="number" 
 value={maxCapacity} 
 onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 100)}
 className="w-full bg-background border border-neutral-100 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none"
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600">Emergency Capacity Cap</label>
 <input 
 type="number" 
 value={emergencyCapacity} 
 onChange={(e) => setEmergencyCapacity(parseInt(e.target.value) || 100)}
 className="w-full bg-background border border-neutral-100 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
 <div className="space-y-2">
 <div className="flex justify-between">
 <label className="text-[10px] text-neutral-600">Warning Alert Threshold</label>
 <span className="text-xs text-amber-700 font-bold">{warningThreshold}%</span>
 </div>
 <input
 type="range"
 min="50"
 max="100"
 value={warningThreshold}
 onChange={(e) => setWarningThreshold(parseInt(e.target.value))}
 className="w-full h-1 bg-neutral-50 rounded-lg appearance-none cursor-pointer accent-amber-600"
 />
 </div>
 <div className="space-y-2">
 <div className="flex justify-between">
 <label className="text-[10px] text-neutral-600">Critical Alert Threshold</label>
 <span className="text-xs text-danger font-bold">{criticalThreshold}%</span>
 </div>
 <input
 type="range"
 min="50"
 max="100"
 value={criticalThreshold}
 onChange={(e) => setCriticalThreshold(parseInt(e.target.value))}
 className="w-full h-1 bg-neutral-50 rounded-lg appearance-none cursor-pointer accent-danger"
 />
 </div>
 </div>
 </div>
 </div>
 )}

 {/* NOTIFICATION SETTINGS */}
 {activeCategory === 'notifications' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Notifications & Channels</h3>
 <p className="text-neutral-600 text-xs mt-0.5">Toggle automated notifications across in-app, SMS, and email alerts.</p>
 </div>

 <div className="space-y-4">
 <span className="text-[10px] font-black text-neutral-600 uppercase tracking-wider block">Trigger Conditions</span>
 <div className="grid grid-cols-2 gap-3">
 {[
 { label: 'Check-In Confirmations', state: notifyCheckIn, set: setNotifyCheckIn },
 { label: 'Check-Out Confirmations', state: notifyCheckOut, set: setNotifyCheckOut },
 { label: 'Denied Entry Warnings', state: notifyDenied, set: setNotifyDenied },
 { label: 'Branch Over-Capacity Alerts', state: notifyCapacity, set: setNotifyCapacity },
 { label: 'Plan Expiry Alerts', state: notifyExpiry, set: setNotifyExpiry },
 { label: 'Milestone Congratulations', state: notifyMilestones, set: setNotifyMilestones },
 ].map((notif, idx) => (
 <div key={idx} className="flex items-center justify-between p-3.5 bg-background border border-neutral-100 rounded-xl">
 <span className="text-xs text-neutral-700 font-semibold">{notif.label}</span>
 <input 
 type="checkbox" 
 checked={notif.state}
 onChange={(e) => notif.set(e.target.checked)}
 className="w-4 h-4 rounded text-primary accent-primary bg-neutral-50 border-neutral-200"
 />
 </div>
 ))}
 </div>

 <div className="border-t border-neutral-100/60 pt-4 space-y-3">
 <span className="text-[10px] font-black text-neutral-600 uppercase tracking-wider block">Preferred Notification Channels</span>
 <div className="flex gap-4">
 {[
 { label: 'In-App Alerts', state: channelInApp, set: setChannelInApp },
 { label: 'SMS Notifications', state: channelSms, set: setChannelSms },
 { label: 'Email Confirmations', state: channelEmail, set: setChannelEmail },
 ].map((chan, idx) => (
 <div key={idx} className="flex-1 flex items-center justify-between p-3.5 bg-background border border-neutral-100 rounded-xl">
 <span className="text-xs text-neutral-700 font-semibold">{chan.label}</span>
 <input 
 type="checkbox" 
 checked={chan.state}
 onChange={(e) => chan.set(e.target.checked)}
 className="w-4 h-4 rounded text-primary accent-primary bg-neutral-50 border-neutral-200"
 />
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* AUTOMATION SETTINGS */}
 {activeCategory === 'automation' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Automation Settings</h3>
 <p className="text-neutral-600 text-xs mt-0.5">Control automatic validation runs, daily logs cleanup, and inactive member tags.</p>
 </div>

 <div className="space-y-4">
 {[
 { label: 'Auto Expiry Check', desc: 'Scan expired member files hourly to restrict scan codes.', state: autoExpiryValidation, set: setAutoExpiryValidation },
 { label: 'Closing Time Auto Check-Out', desc: 'Automatically check out active members when branches close.', state: autoCheckOutAuto, set: setAutoCheckOutAuto },
 { label: 'Daily Logs Clean-up', desc: 'Archive completed session logs older than audit threshold.', state: attendanceCleanup, set: setAttendanceCleanup },
 { label: 'Inactive Member Triggers', desc: 'Trigger reminders if a regular member hasn\'t scanned in 14 days.', state: inactiveMemberDetection, set: setInactiveMemberDetection },
 ].map((auto, idx) => (
 <div key={idx} className="flex items-center justify-between p-4 bg-background border border-neutral-100 rounded-xl">
 <div>
 <span className="text-xs font-black text-neutral-800 block">{auto.label}</span>
 <span className="text-[10px] text-neutral-500">{auto.desc}</span>
 </div>
 <input 
 type="checkbox" 
 checked={auto.state}
 onChange={(e) => auto.set(e.target.checked)}
 className="w-4 h-4 rounded text-primary accent-primary bg-neutral-50 border-neutral-200"
 />
 </div>
 ))}
 </div>
 </div>
 )}

 {/* SECURITY & OVERRIDES */}
 {activeCategory === 'security' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Security & Manual Override</h3>
 <p className="text-neutral-600 text-xs mt-0.5">Establish access control rules for staff overrides and logs auditing.</p>
 </div>

 <div className="space-y-4">
 <div className="flex items-center justify-between p-4 bg-background border border-neutral-100 rounded-xl">
 <div>
 <span className="text-xs font-black text-neutral-800 block">Allow Manual Check-In Overrides</span>
 <span className="text-[10px] text-neutral-500">Allow staff to override failed scanner warnings.</span>
 </div>
 <input 
 type="checkbox" 
 checked={allowManualOverride}
 onChange={(e) => setAllowManualOverride(e.target.checked)}
 className="w-4 h-4 rounded text-primary accent-primary bg-neutral-50 border-neutral-200"
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-[10px] font-black text-neutral-600 uppercase tracking-wider">Who Can Override Denials</label>
 <select
 value={whoCanOverride}
 onChange={(e) => setWhoCanOverride(e.target.value)}
 className="w-full bg-background border border-neutral-100 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none"
 >
 <option value="Owner Only">Owner Only</option>
 <option value="Owner & Manager">Owner & Manager</option>
 <option value="All Reception Staff">All Reception Staff</option>
 </select>
 </div>

 <div className="space-y-1.5">
 <label className="text-[10px] font-black text-neutral-600 uppercase tracking-wider">Audit Log Retention (Days)</label>
 <select
 value={logRetentionPeriod}
 onChange={(e) => setLogRetentionPeriod(parseInt(e.target.value) || 90)}
 className="w-full bg-background border border-neutral-100 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 focus:outline-none"
 >
 <option value="30">30 Days</option>
 <option value="90">90 Days</option>
 <option value="180">180 Days</option>
 <option value="365">365 Days</option>
 </select>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ROLE PERMISSION MATRIX */}
 {activeCategory === 'permissions' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Role Permissions Matrix</h3>
 <p className="text-neutral-600 text-xs mt-0.5">Determine check-in and dashboard configuration permissions across user roles.</p>
 </div>

 <div className="flex items-start gap-2 p-3 bg-warning-light border border-amber-200 rounded-xl text-[11px] text-amber-700">
 <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
 <span>
 Preview only - this table doesn&apos;t save yet. Actual role permissions (including attendance access) are managed under{' '}
 <button onClick={() => router.push('/workspace/roles')} className="underline font-bold hover:text-amber-700">Roles &amp; Permissions</button>.
 </span>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead>
 <tr className="border-b border-neutral-100 text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
 <th className="pb-3">Role</th>
 <th className="pb-3">View Logs</th>
 <th className="pb-3">Check-In Member</th>
 <th className="pb-3">Modify Settings</th>
 <th className="pb-3">Manual Override</th>
 <th className="pb-3">Export Data</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100/60">
 {permissionsMatrix.map((row, idx) => (
 <tr key={idx} className="hover:bg-neutral-50/20">
 <td className="py-3 font-bold text-neutral-800">{row.role}</td>
 <td className="py-3">
 <select 
 value={row.view} 
 onChange={(e) => handlePermissionChange(idx, 'view', e.target.value)}
 className="bg-background border border-neutral-100 rounded-lg px-2 py-1 text-[11px] text-neutral-700"
 >
 <option value="Full">Full</option>
 <option value="Limited">Limited</option>
 <option value="Own Only">Own Only</option>
 <option value="View Only">View Only</option>
 <option value="None">None</option>
 </select>
 </td>
 <td className="py-3">
 <select 
 value={row.checkin} 
 onChange={(e) => handlePermissionChange(idx, 'checkin', e.target.value)}
 className="bg-background border border-neutral-100 rounded-lg px-2 py-1 text-[11px] text-neutral-700"
 >
 <option value="Full">Full</option>
 <option value="Limited">Limited</option>
 <option value="Own Only">Own Only</option>
 <option value="None">None</option>
 </select>
 </td>
 <td className="py-3">
 <select 
 value={row.edit} 
 onChange={(e) => handlePermissionChange(idx, 'edit', e.target.value)}
 className="bg-background border border-neutral-100 rounded-lg px-2 py-1 text-[11px] text-neutral-700"
 >
 <option value="Full">Full</option>
 <option value="Limited">Limited</option>
 <option value="Branch Only">Branch Only</option>
 <option value="None">None</option>
 </select>
 </td>
 <td className="py-3">
 <select 
 value={row.override} 
 onChange={(e) => handlePermissionChange(idx, 'override', e.target.value)}
 className="bg-background border border-neutral-100 rounded-lg px-2 py-1 text-[11px] text-neutral-700"
 >
 <option value="Full">Full</option>
 <option value="Limited">Limited</option>
 <option value="None">None</option>
 </select>
 </td>
 <td className="py-3">
 <select 
 value={row.export} 
 onChange={(e) => handlePermissionChange(idx, 'export', e.target.value)}
 className="bg-background border border-neutral-100 rounded-lg px-2 py-1 text-[11px] text-neutral-700"
 >
 <option value="Full">Full</option>
 <option value="Limited">Limited</option>
 <option value="None">None</option>
 </select>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* BRANCH & PLAN OVERRIDES */}
 {activeCategory === 'overrides' && (
 <div className="space-y-6">
 <div className="flex items-start gap-2 p-3 bg-warning-light border border-amber-200 rounded-xl text-[11px] text-amber-700">
 <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
 <span>
 Preview only - per-branch and per-plan overrides shown below are illustrative and don&apos;t save yet. Use the branch
 selector at the top of this page to configure each branch&apos;s real settings individually instead.
 </span>
 </div>

 <div className="space-y-4">
 <div>
 <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Branch-Specific Configurations</h3>
 <p className="text-neutral-600 text-xs mt-0.5">Configure rule overrides for individual gym branches.</p>
 </div>

 <div className="space-y-2">
 {branchOverrides.map((br) => (
 <div key={br.id} className="flex justify-between items-center p-3.5 bg-background border border-neutral-100 rounded-xl">
 <div>
 <span className="text-xs font-bold text-neutral-800 block">{br.name}</span>
 <span className="text-[10px] text-neutral-500">Capacity Cap: {br.capacity} | Hours: {br.checkInHours}</span>
 </div>
 <button className="text-primary hover:text-primary-hover text-[10px] font-bold border border-primary/20 bg-primary-light px-2.5 py-1 rounded-lg">
 Edit Overrides ({br.overrides})
 </button>
 </div>
 ))}
 </div>
 </div>

 <div className="border-t border-neutral-100/60 pt-6 space-y-4">
 <div>
 <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Membership Plan Overrides</h3>
 <p className="text-neutral-600 text-xs mt-0.5">Control specific check-in limits and rules per tier plan.</p>
 </div>

 <div className="space-y-2">
 {planOverrides.map((pl) => (
 <div key={pl.id} className="flex justify-between items-center p-3.5 bg-background border border-neutral-100 rounded-xl">
 <div>
 <span className="text-xs font-bold text-neutral-800 block">{pl.name}</span>
 <span className="text-[10px] text-neutral-500">Limit: {pl.maxCheckIns} checkins/day | Hours: {pl.allowedHours} | Cross Branch: {pl.crossBranch}</span>
 </div>
 <button className="text-primary hover:text-primary-hover text-[10px] font-bold border border-primary/20 bg-primary-light px-2.5 py-1 rounded-lg">
 Edit Rules
 </button>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* CHANGE HISTORY LOG */}
 {activeCategory === 'history' && (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Change History & Auditing</h3>
 <p className="text-neutral-600 text-xs mt-0.5">Real audit trail of attendance settings saves for this organization.</p>
 </div>
 <button
 onClick={fetchHistory}
 className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 text-[10px] font-bold rounded-lg transition flex items-center gap-1.5"
 >
 <RefreshCw className={`w-3 h-3 ${historyLoading ? 'animate-spin' : ''}`} />
 Refresh
 </button>
 </div>

 <div className="space-y-3">
 {historyLoading && historyLog.length === 0 && (
 <p className="p-8 text-center text-neutral-500 text-xs font-semibold">Loading history...</p>
 )}
 {!historyLoading && historyLog.length === 0 && (
 <p className="p-8 text-center text-neutral-500 text-xs font-semibold">No attendance settings changes recorded yet.</p>
 )}
 {historyLog.map((log) => (
 <div key={log.id} className="p-4 bg-background border border-neutral-100 rounded-xl space-y-1.5 text-xs">
 <div className="flex justify-between items-start">
 <span className="font-bold text-neutral-800">{log.action}</span>
 <span className="text-[10px] text-neutral-500">{log.timestamp}</span>
 </div>
 <p className="text-[11px] text-neutral-600">{log.details}</p>
 <span className="text-[10px] text-neutral-500">By: <span className="text-neutral-700 font-semibold">{log.user}</span></span>
 </div>
 ))}
 </div>
 </div>
 )}


 </div>
 </div>

 {/* Impact Analysis Modal */}
 {showImpactModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
 <div className="bg-white border border-neutral-200 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
 <div className="flex items-center gap-3 text-amber-700">
 <AlertTriangle className="w-6 h-6 flex-shrink-0" />
 <div>
 <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Settings Impact Analysis</h3>
 <span className="text-[10px] text-neutral-600">Evaluate policies impact before saving.</span>
 </div>
 </div>

 <div className="space-y-3 text-xs bg-neutral-50/60 p-4 border border-neutral-100 rounded-2xl">
 <div className="flex justify-between border-b border-neutral-100 pb-2">
 <span className="text-neutral-600">Affected Branches:</span>
 <span className="font-bold text-neutral-800">3 Branches (All)</span>
 </div>
 <div className="flex justify-between border-b border-neutral-100 pb-2">
 <span className="text-neutral-600">Affected Membership Plans:</span>
 <span className="font-bold text-neutral-800">9 Active Tiers</span>
 </div>
 <div className="flex justify-between border-b border-neutral-100 pb-2">
 <span className="text-neutral-600">Impacted Members:</span>
 <span className="font-bold text-neutral-800">1,482 Members</span>
 </div>
 <div className="space-y-1.5 pt-1">
 <span className="text-[10px] font-black text-neutral-600 uppercase tracking-wider block">Potential System Risks:</span>
 <ul className="list-disc list-inside text-[10px] text-amber-700 space-y-1">
 <li>Financial Blocking policy will deny entrance to 52 members in arrears.</li>
 <li>Duplicate Scan prevention (30m) may block fast re-entry requests.</li>
 </ul>
 </div>
 </div>

 <div className="flex gap-3 pt-2">
 <button
 onClick={() => setShowImpactModal(false)}
 className="flex-1 bg-neutral-50 hover:bg-neutral-50 border border-neutral-200 rounded-xl py-2.5 text-xs font-bold text-neutral-700 transition"
 >
 Cancel & Review
 </button>
 <button
 onClick={saveAllSettings}
 className="flex-1 bg-primary hover:bg-primary-hover rounded-xl py-2.5 text-xs font-black text-white transition shadow-lg"
 >
 Confirm & Apply
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

export default function AttendanceSettingsPage() {
 return (
 <Suspense fallback={
 <div className="p-6 max-w-[1600px] mx-auto text-neutral-900 min-h-screen bg-background flex items-center justify-center">
 <div className="flex items-center gap-3">
 <RefreshCw className="w-5 h-5 animate-spin text-primary" />
 <span className="text-xs text-neutral-600">Loading Configuration Center...</span>
 </div>
 </div>
 }>
 <AttendanceSettingsContent />
 </Suspense>
 );
}
