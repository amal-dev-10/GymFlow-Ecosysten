'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
 Monitor,
 Activity,
 Search,
 CheckCircle,
 XCircle,
 AlertTriangle,
 History,
 RefreshCw,
 Zap,
 Check,
 Info,
 Clock,
 QrCode,
 Volume2,
 VolumeX,
 UserPlus,
 ArrowRight,
 ShieldAlert,
 Lock,
 ChevronDown,
 Cpu,
 Tv,
 Scan,
 CreditCard,
 Camera,
 Heart,
 ScanLine
} from 'lucide-react';
import { gymApi, membersApi, attendanceApi, rolesApi } from '../../../lib/api';
import { mapApiMembersToLocal, MemberCheckIn as MappedMemberCheckIn } from '../../../lib/api/mappers';
import { playBeep, useBeepEnabled } from '../../../lib/beep';
import {
 useTodayAttendance,
 useAttendanceStats,
 useOccupancy,
 useDevices,
 useMemberSearch,
 useCheckIn,
 useCheckOut,
 useAttendanceSocket,
} from '../../../hooks/useAttendanceTerminal';
import AttendanceTabs from './AttendanceTabs';

// ----------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------
export interface AttendanceEvent {
 memberId?: string;
 memberName?: string;
 method: 'Manual Search' | 'QR Code' | 'Fingerprint' | 'RFID Card' | 'Face Recognition' | 'Barcode Scan' | 'Guest Entry' | 'Override';
 deviceId?: string;
 timestamp: string;
}

type MemberCheckIn = MappedMemberCheckIn;

interface AttendanceRecord {
 id: string;
 memberName: string;
 memberId: string;
 branchName: string;
 checkInTime: string;
 checkOutTime?: string;
 method: string;
 status: 'Granted' | 'Denied';
 reason?: string;
 trainerNotified?: boolean;
}

// ----------------------------------------------------------------------
// Main Content Component
// ----------------------------------------------------------------------
function AttendanceTerminalContent() {
 const router = useRouter();

 // Basic Page States
 const [loading, setLoading] = useState(true);
 const [userRole, setUserRole] = useState('manager'); // 'owner', 'manager', 'receptionist', 'trainer', 'dietitian'
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 // Kiosk Mode & Modals
 const [isKioskMode, setIsKioskMode] = useState(false);
 const [showGuestModal, setShowGuestModal] = useState(false);

 // Search & Terminal states
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedMember, setSelectedMember] = useState<MemberCheckIn | null>(null);
 const [soundEnabled, setSoundEnabled] = useBeepEnabled();

 // Active Branch
 const [activeBranchId, setActiveBranchId] = useState('');
 const [branches, setBranches] = useState<any[]>([]);

 // Validation / Check-in Response states
 const [lastEvent, setLastEvent] = useState<AttendanceEvent | null>(null);
 const [checkInResult, setCheckInResult] = useState<'Granted' | 'Denied' | null>(null);
 const [checkInReason, setCheckInReason] = useState<string>('');
 const [isValidating, setIsValidating] = useState(false);

 // Live data via React Query
 const { data: attendanceLogsData, refetch: refetchLogs } = useTodayAttendance(activeBranchId);
 const { data: statsData, refetch: refetchStats } = useAttendanceStats(activeBranchId);
 const { data: occupancyData, isLoading: occupancyLoading } = useOccupancy(activeBranchId);
 const { data: devicesData, isLoading: devicesLoading } = useDevices(activeBranchId);
 const { suggestions: filteredSuggestions } = useMemberSearch(searchQuery, branches);
 const checkInMutation = useCheckIn(activeBranchId);
 const checkOutMutation = useCheckOut(activeBranchId);

 const attendanceLogs: AttendanceRecord[] = attendanceLogsData || [];
 const stats = {
 activeInside: statsData?.activeInside || 0,
 totalCheckInsToday: statsData?.totalCheckInsToday || 0,
 totalDenied: statsData?.totalDenied || 0,
 };

 // Device icon mapping per device type
 const deviceIconFor = (type: string) => {
 switch (type) {
 case 'QR_SCANNER': return QrCode;
 case 'FINGERPRINT': return Cpu;
 case 'RFID': return CreditCard;
 case 'FACE_CAMERA': return Camera;
 case 'TURNSTILE': return ScanLine;
 case 'BARCODE': return ScanLine;
 default: return Monitor;
 }
 };

 const devicesStatus = (devicesData || []).map((d: any) => ({
 id: d.id,
 name: d.name,
 status: d.status,
 icon: deviceIconFor(d.type),
 }));

 const refreshTerminalData = async () => {
 await Promise.all([refetchLogs(), refetchStats()]);
 };

 // Audit log helper (never blocks main flow)
 const logAudit = async (action: string, details: string, metadata?: any) => {
 try {
 await rolesApi.createAuditLog({
 action,
 details,
 eventType: 'Attendance',
 eventCategory: 'attendance',
 metadata,
 });
 } catch (_) {}
 };

 // Toast Helper
 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 // Load Data (branches only; attendance/stats/occupancy/devices are React Query hooks keyed by activeBranchId)
 const loadData = async () => {
 try {
 setLoading(true);
 const orgId = localStorage.getItem('organizationId') || '';
 const branchList = await gymApi.list(orgId);
 setBranches(branchList || []);

 if (branchList && branchList.length > 0) {
 setActiveBranchId(branchList[0].id);
 }
 } catch (err) {
 console.error(err);
 showToast('Failed to load initial terminal parameters', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 const userStr = localStorage.getItem('user');
 if (userStr) {
 try {
 const u = JSON.parse(userStr);
 if (u.role) setUserRole(u.role.toLowerCase());
 } catch (_) {}
 }
 loadData();
 }, []);

 const isTrainerOrDietitian = userRole === 'trainer' || userRole === 'dietitian';
 const currentBranch = branches.find(b => b.id === activeBranchId) || { name: 'Gym Branch' };

 // Live socket connection: keeps logs/stats/occupancy/devices fresh as scans come in
 // from other terminals/devices. Workspace-wide toasts + beep for those events are
 // handled globally (see useGlobalAttendanceNotifications in the workspace layout),
 // so this terminal doesn't double-notify when it's the page that's open.
 const { connected: socketConnected } = useAttendanceSocket(activeBranchId, {});

 // ----------------------------------------------------------------------
 // UNIFIED ATTENDANCE FLOW State Machine (Phase 3 & 4)
 // ----------------------------------------------------------------------
 const executeAttendanceWorkflow = async (event: AttendanceEvent) => {
 setIsValidating(true);
 setLastEvent(event);
 setCheckInResult(null);
 setCheckInReason('');

 try {
 // 1. Identify Member & Validate Membership
 let memberInfo: MemberCheckIn | null = null;
 
 if (event.memberId) {
 // Fetch the member directly by ID. Searching by ID via the text-search
 // endpoint never matched (it only matches firstName/lastName/phoneNumber),
 // which incorrectly denied every manual-search check-in as an
 //"Unregistered device tag identifier" even for a real, just-selected member.
 try {
 const result = await membersApi.get(event.memberId);
 const mapped = mapApiMembersToLocal([result], branches);
 memberInfo = mapped[0] || null;
 } catch (_) {
 memberInfo = null;
 }
 }

 if (event.memberName && !event.memberId) {
 // Guest registration logic bypasses direct database lookup
 const res = await checkInMutation.mutateAsync({
 gymId: activeBranchId,
 method: event.method,
 memberName: event.memberName,
 });

 if (res.success) {
 setCheckInResult('Granted');
 playBeep(true);
 showToast(`Welcome! Guest checked in under ${event.memberName}.`);
 } else {
 setCheckInResult('Denied');
 setCheckInReason(res.reason || 'Guest entry blocked');
 playBeep(false);
 }
 await logAudit('Guest Check-in', event.memberName, { method: event.method, success: res.success });
 setIsValidating(false);
 return;
 }

 if (!memberInfo) {
 // Unknown token scanned
 setCheckInResult('Denied');
 setCheckInReason(`Unregistered device tag identifier (${event.memberId || 'N/A'})`);
 playBeep(false);
 setIsValidating(false);
 return;
 }

 setSelectedMember(memberInfo);

 // 2. Submit entry log to database
 const res = await checkInMutation.mutateAsync({
 memberId: memberInfo.id,
 gymId: activeBranchId,
 method: event.method,
 });

 // 3. Display Result Card & Trigger Gate sound chimes
 if (res.success) {
 setCheckInResult('Granted');
 playBeep(true);
 if (res.status === 'Warning') {
 showToast(`Turnstile unlocked with alert: ${res.reason}`, 'error');
 } else {
 showToast(`Turnstile gates unlocked. Welcome back, ${memberInfo.name}!`);
 }
 } else {
 setCheckInResult('Denied');
 setCheckInReason(res.reason || 'Rules engine check failed');
 playBeep(false);
 }
 await logAudit('Check-in', memberInfo.name, { method: event.method, success: res.success, memberId: memberInfo.id });
 } catch (err: any) {
 console.error(err);
 const errMsg = err.response?.data?.message || 'Check-in validation timed out';
 setCheckInResult('Denied');
 setCheckInReason(errMsg);
 playBeep(false);
 } finally {
 setIsValidating(false);
 }
 };

 const handleManualCheckOut = async (recordId: string) => {
 try {
 await checkOutMutation.mutateAsync(recordId);
 showToast('Checked out member.');
 await logAudit('Check-out', recordId, { recordId });
 } catch (err) {
 console.error(err);
 showToast('Check-out failed', 'error');
 }
 };

 const handleRegisterGuestSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (isTrainerOrDietitian) {
 showToast('Trainer/Dietitian is View-Only', 'error');
 return;
 }
 const form = e.currentTarget as HTMLFormElement;
 const nameInput = form.elements.namedItem('guestName') as HTMLInputElement;
 const purposeSelect = form.elements.namedItem('guestPurpose') as HTMLSelectElement;

 if (!nameInput.value) return;

 const event: AttendanceEvent = {
 memberName: `${nameInput.value} (${purposeSelect.value})`,
 method: 'Guest Entry',
 timestamp: new Date().toISOString()
 };

 setShowGuestModal(false);
 await executeAttendanceWorkflow(event);
 };

 // Overrides Resolutions
 const resolveUnfreeze = async (member: MemberCheckIn) => {
 if (isTrainerOrDietitian) return;
 try {
 await checkInMutation.mutateAsync({ memberId: member.id, gymId: activeBranchId, method: 'Override: Unfreeze' });
 showToast(`Membership hold terminated for ${member.name}.`);
 setCheckInResult('Granted');
 playBeep(true);
 await logAudit('Override: Unfreeze', member.name, { memberId: member.id });
 } catch (_) {}
 };

 const resolveRenewal = async (member: MemberCheckIn) => {
 if (isTrainerOrDietitian) return;
 try {
 await checkInMutation.mutateAsync({ memberId: member.id, gymId: activeBranchId, method: 'Override: Renewal' });
 showToast(`Membership extended for ${member.name}.`);
 setCheckInResult('Granted');
 playBeep(true);
 await logAudit('Override: Renewal', member.name, { memberId: member.id });
 } catch (_) {}
 };

 const resolveSinglePass = async (member: MemberCheckIn) => {
 if (isTrainerOrDietitian) return;
 try {
 await checkInMutation.mutateAsync({
 gymId: activeBranchId,
 method: 'Guest Entry',
 memberName: `${member.name} (One-Day Pass)`,
 });
 setCheckInResult('Granted');
 playBeep(true);
 showToast('Paid single visit pass registered. Gate unlocked.');
 await logAudit('Single Visit Pass Sold', member.name, { memberId: member.id });
 } catch (_) {}
 };

 const resolveTransfer = async (member: MemberCheckIn) => {
 if (isTrainerOrDietitian) return;
 try {
 await checkInMutation.mutateAsync({ memberId: member.id, gymId: activeBranchId, method: 'Override: Transfer Access' });
 showToast(`Temporary access override stored for ${member.name}.`);
 setCheckInResult('Granted');
 playBeep(true);
 await logAudit('Override: Transfer Access', member.name, { memberId: member.id });
 } catch (_) {}
 };

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Establishing turnstile dashboard scanner connections...
 </div>
 );
 }

 return (
 <div className="p-6 max-w-[1600px] mx-auto space-y-6 text-neutral-900 min-h-screen bg-background relative overflow-hidden">
 {/* Background glow styling */}

 {/* TOAST NOTIFICATION CONTAINER */}
 {toast && (
 <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold transition-all duration-300 transform translate-y-0 ${
 toast.type === 'success' ? 'bg-success-light border-green-200 text-success' : 'bg-danger-light border-red-200 text-danger'
 }`}>
 {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-success" /> : <AlertTriangle className="w-4 h-4 text-danger" />}
 <span>{toast.message}</span>
 </div>
 )}

 {/* HEADER ROW */}
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-neutral-200/80 pb-6">
 <div className="flex-1">
 <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2.5">
 <span className="w-10 h-10 rounded-2xl bg-primary-light border border-primary/20 flex items-center justify-center shrink-0">
 <Monitor className="w-5 h-5 text-primary" />
 </span>
 Check-In Reception Terminal
 </h1>
 <p className="text-xs text-neutral-500 mt-1.5 ml-[50px]">
 Coordinated terminal gate controller, guest registrations, biometrics simulations, and branch occupancy logs.
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
 {isTrainerOrDietitian && (
 <div className="px-3 py-2 bg-warning-light border border-amber-200 text-amber-700 text-[10px] rounded-xl flex items-center gap-2 uppercase font-bold">
 <ShieldAlert className="w-4 h-4" />
 <span>Trainer/Dietitian View Only</span>
 </div>
 )}

 <div
 className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wide ${
 socketConnected ? 'bg-success-light border-green-200 text-success' : 'bg-neutral-50 border-neutral-200 text-neutral-400'
 }`}
 title={socketConnected ? 'Live updates connected' : 'Live updates offline — reconnecting'}
 >
 <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-success animate-pulse' : 'bg-neutral-300'}`} />
 <span>{socketConnected ? 'Live' : 'Offline'}</span>
 </div>

 <select
 className="bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light cursor-pointer"
 value={activeBranchId}
 onChange={e => {
 setActiveBranchId(e.target.value);
 setCheckInResult(null);
 setSelectedMember(null);
 // React Query keys include gymId, so switching branches auto-refetches.
 }}
 >
 {branches.map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>

 <button
 onClick={() => setSoundEnabled(!soundEnabled)}
 className={`p-2.5 rounded-xl border transition flex items-center gap-2 text-xs font-bold cursor-pointer ${
 soundEnabled ? 'bg-primary-light border-primary/20 text-primary' : 'bg-neutral-50 border-neutral-200 text-neutral-500'
 }`}
 >
 {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
 <span className="hidden sm:inline">{soundEnabled ? 'Beep On' : 'Beep Off'}</span>
 </button>

 {!isTrainerOrDietitian && (
 <button
 onClick={() => setShowGuestModal(true)}
 className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm"
 >
 <UserPlus className="w-4 h-4" />
 <span>Guest Check-in</span>
 </button>
 )}
 </div>
 </div>

 {/* CORE NAVIGATION TABS */}
 <AttendanceTabs />

 {/* DEVICE STATUS BAR */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4.5">
 <div className="flex items-center gap-2 select-none">
 <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">LIVE INPUT STATUS:</span>
 <div className="flex flex-wrap gap-3">
 {devicesLoading ? (
 <div className="text-[10px] text-neutral-500">Loading devices…</div>
 ) : devicesStatus.length === 0 ? (
 <div className="text-[10px] text-neutral-500">No devices registered</div>
 ) : (
 devicesStatus.map((dev: any) => (
 <div key={dev.id} className="flex items-center gap-1.5 bg-neutral-50/60 border border-neutral-100 rounded-lg px-2.5 py-1 text-[10px] text-neutral-600">
 <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
 dev.status === 'ONLINE' ? 'bg-success' : dev.status === 'ERROR' ? 'bg-danger' : 'bg-neutral-100'
 }`} />
 <dev.icon size={11} className="text-neutral-500" />
 <span>{dev.name}</span>
 </div>
 ))
 )}
 </div>
 </div>
 </div>

 {/* CORE GRID LAYOUT */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
 
 {/* LEFT COLUMN: MEMBER LOOKUP DIRECTORY */}
 <div className="lg:col-span-1 space-y-6">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4 relative">
 <div>
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Search Member Directory</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Quick manual search checkin by membership name or phone number.</p>
 </div>

 <div className="relative">
 <Search className="absolute left-3.5 top-3.5 text-neutral-500 w-4 h-4" />
 <input
 type="text"
 placeholder="Search by name, phone or ID..."
 className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-4 py-3 text-xs text-neutral-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light transition-all"
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 />
 </div>

 {searchQuery && (
 <div className="absolute left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-2xl z-30 max-h-60 overflow-y-auto divide-y divide-neutral-200/30">
 {filteredSuggestions.length === 0 ? (
 <div className="p-3 text-[10px] text-neutral-500 italic">No matching members found.</div>
 ) : (
 filteredSuggestions.map((m) => (
 <div
 key={m.id}
 onClick={async () => {
 setSearchQuery('');
 const event: AttendanceEvent = {
 memberId: m.id,
 method: 'Manual Search',
 timestamp: new Date().toISOString()
 };
 await executeAttendanceWorkflow(event);
 }}
 className="p-3 text-xs cursor-pointer hover:bg-neutral-50/40 flex justify-between items-center transition"
 >
 <div>
 <span className="font-bold text-neutral-800 block">{m.name}</span>
 <span className="text-[10px] text-neutral-500 font-mono">{m.memberId} • {m.phone}</span>
 </div>
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.status === 'Active' ? 'bg-success-light text-success border border-green-200' : 'bg-danger-light text-danger border border-red-200'}`}>
 {m.status}
 </span>
 </div>
 ))
 )}
 </div>
 )}
 </div>

 {/* Quick branch occupancy dashboard */}
 <div className="bg-white border border-neutral-200/60 p-5 rounded-3xl space-y-4">
 <span className="text-[10px] text-neutral-500 uppercase block font-bold tracking-wider">Branch Capacity</span>
 {(() => {
 const current = occupancyData?.current ?? stats.activeInside;
 const capacity = occupancyData?.capacity;
 const pct = capacity ? Math.min(Math.round((current / capacity) * 100), 100) : 0;
 const barColor = pct > 90 ? 'bg-danger' : pct > 70 ? 'bg-warning' : 'bg-success';
 return (
 <div>
 <div className="flex items-baseline gap-1.5">
 <span className="text-3xl font-black text-neutral-900">{occupancyLoading ? '—' : current}</span>
 <span className="text-sm text-neutral-400">/ {capacity ?? '—'} inside now</span>
 </div>
 <div className="h-2 bg-neutral-100 rounded-full overflow-hidden mt-3">
 <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct || 2}%` }} />
 </div>
 </div>
 );
 })()}
 <div className="grid grid-cols-2 gap-3 pt-1">
 <div className="p-3 bg-primary-light border border-primary/10 rounded-xl">
 <span className="text-[9px] text-neutral-500 block font-bold uppercase">Check-ins Today</span>
 <span className="text-lg font-black text-primary block mt-0.5">{stats.totalCheckInsToday}</span>
 </div>
 <div className="p-3 bg-danger-light border border-red-100 rounded-xl">
 <span className="text-[9px] text-neutral-500 block font-bold uppercase">Denied Today</span>
 <span className="text-lg font-black text-danger block mt-0.5">{stats.totalDenied}</span>
 </div>
 </div>
 </div>
 </div>

 {/* MIDDLE COLUMN: CHECKIN RESPONSE CARD (ResultCard) */}
 <div className="lg:col-span-1 space-y-6">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 min-h-[360px] flex flex-col justify-between shadow-xl relative">
 
 {isValidating && (
 <div className="absolute inset-0 bg-white/95 z-20 flex flex-col justify-center items-center rounded-3xl space-y-2">
 <RefreshCw size={22} className="text-primary animate-spin" />
 <span className="text-[10px] text-neutral-600 uppercase font-bold tracking-wide">Evaluating Access Rules...</span>
 </div>
 )}

 {checkInResult === null ? (
 <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3.5">
 <div className="w-20 h-20 rounded-full bg-primary-light border border-primary/10 flex items-center justify-center">
 <Scan className="text-primary w-9 h-9" />
 </div>
 <h4 className="text-sm font-black text-neutral-700 uppercase tracking-wider">Awaiting Scan Event</h4>
 <p className="text-xs text-neutral-500 max-w-[220px] leading-relaxed">
 Terminal is ready. Scan a QR code pass, swipe an RFID card, tap biometric scanner, or search a member to evaluate rules.
 </p>
 </div>
 ) : checkInResult === 'Granted' && selectedMember ? (
 <div className="flex-1 flex flex-col justify-between space-y-4 animate-scale-in">
 {/* Result header */}
 <div className="bg-success-light border border-green-200 p-4 rounded-xl flex items-start gap-3">
 <CheckCircle className="text-success w-5 h-5 mt-0.5 shrink-0" />
 <div>
 <h4 className="font-bold text-success text-xs uppercase tracking-wide">Access Granted</h4>
 <p className="text-[10px] text-neutral-600 mt-0.5">Turnstile unlocked successfully.</p>
 </div>
 </div>

 {/* Profile card details */}
 <div className="bg-white border border-neutral-200 p-4 rounded-xl space-y-2.5 text-xs">
 <div className="flex justify-between"><span className="text-neutral-500">Member:</span><span className="text-neutral-800 font-bold">{selectedMember.name}</span></div>
 <div className="flex justify-between"><span className="text-neutral-500">Checkin Method:</span><span className="text-primary font-semibold">{lastEvent?.method}</span></div>
 <div className="flex justify-between"><span className="text-neutral-500">Membership Plan:</span><span className="text-neutral-800">{selectedMember.planName}</span></div>
 <div className="flex justify-between"><span className="text-neutral-500">Expiry Date:</span><span className="text-success font-bold">{selectedMember.expiryDate}</span></div>
 <div className="flex justify-between"><span className="text-neutral-500">Home Base:</span><span className="text-neutral-800">{selectedMember.homeBranchName}</span></div>
 </div>

 <button
 onClick={() => showToast('Check-in receipt passes printed.')}
 className="w-full py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 font-bold text-xs rounded-xl transition cursor-pointer"
 >
 Print Entry Ticket
 </button>
 </div>
 ) : (
 <div className="flex-1 flex flex-col justify-between space-y-4 animate-scale-in">
 {/* Denied header */}
 <div className="bg-danger-light border border-red-200 p-4 rounded-xl flex items-start gap-3">
 <XCircle className="text-danger w-5 h-5 mt-0.5 shrink-0" />
 <div>
 <h4 className="font-bold text-danger text-xs uppercase tracking-wide">Access Denied</h4>
 <p className="text-[10px] text-neutral-600 mt-0.5 leading-normal">{checkInReason || 'Blocked by security validation rules.'}</p>
 </div>
 </div>

 {/* Override Resolution pathways */}
 {selectedMember && (
 <div className="bg-white border border-neutral-200 p-4 rounded-xl space-y-2.5 text-xs">
 <span className="text-[10px] text-neutral-500 uppercase block font-bold tracking-wide">Resolution Pathways</span>
 <div className="grid grid-cols-1 gap-1.5">
 {selectedMember.status === 'Frozen' && (
 <button
 onClick={() => resolveUnfreeze(selectedMember)}
 className="py-2 px-3 bg-success-light border border-green-200 hover:bg-success-light text-success font-bold rounded-lg text-[9.5px] flex justify-between items-center transition cursor-pointer"
 >
 <span>1. Reactivate Profile (Unfreeze hold)</span>
 </button>
 )}

 {checkInReason.includes('Duplicate Check-In') && (
 <button
 onClick={async () => {
 const activeLog = attendanceLogs.find((l: any) => l.memberId === selectedMember.id && !l.checkOutTime);
 if (activeLog) {
 await handleManualCheckOut(activeLog.id);
 setCheckInResult(null);
 }
 }}
 className="py-2 px-3 bg-warning-light border border-amber-200 hover:bg-warning-light text-amber-700 font-bold rounded-lg text-[9.5px] flex justify-between items-center transition cursor-pointer"
 >
 <span>1. Force Check-Out Past Entry</span>
 </button>
 )}

 {selectedMember.status === 'Expired' && (
 <button
 onClick={() => resolveRenewal(selectedMember)}
 className="py-2 px-3 bg-success-light border border-green-200 hover:bg-success-light text-success font-bold rounded-lg text-[9.5px] flex justify-between items-center transition cursor-pointer"
 >
 <span>1. Renew Membership Plan</span>
 </button>
 )}

 {!selectedMember.allowedBranchIds.includes(activeBranchId) && (
 <button
 onClick={() => resolveTransfer(selectedMember)}
 className="py-2 px-3 bg-success-light border border-green-200 hover:bg-success-light text-success font-bold rounded-lg text-[9.5px] flex justify-between items-center transition cursor-pointer"
 >
 <span>1. Add Branch Access Override</span>
 </button>
 )}

 <button
 onClick={() => resolveSinglePass(selectedMember)}
 className="py-2 px-3 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 font-bold rounded-lg text-[9.5px] flex justify-between items-center transition cursor-pointer"
 >
 <span>2. Sell Visit Entry Pass (₹200)</span>
 </button>
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 {/* RIGHT COLUMN: ACTIVITY TIMELINE (ActivityFeed) */}
 <div className="lg:col-span-1 space-y-6">
 <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 space-y-4 shadow-lg">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
 <History size={15} className="text-primary" />
 Live Terminal Log Timeline
 </h3>

 <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-neutral-200">
 {attendanceLogs.length === 0 ? (
 <div className="text-[10px] text-neutral-500 py-6 text-center select-none font-sans">
 No scan events recorded today.
 </div>
 ) : (
 attendanceLogs.slice(0, 10).map((log) => (
 <div key={log.id} className="flex gap-4 relative pl-1.5">
 <div className={`w-5 h-5 rounded-full bg-neutral-50 border flex items-center justify-center z-10 text-[8px] font-bold ${
 log.status === 'Granted' ? 'border-green-200 text-success' : 'border-red-200 text-danger'
 }`}>
 {log.status === 'Granted' ? '✓' : '✕'}
 </div>

 <div className="space-y-1 text-[11px] leading-snug">
 <div className="flex items-center gap-1.5">
 <span className="font-bold text-neutral-800">{log.memberName}</span>
 <span className="text-[8.5px] text-neutral-500">{log.checkInTime}</span>
 </div>
 <p className="text-[10px] text-neutral-600">
 {log.status === 'Granted' ? 'Entered Branch' : `Denied: ${log.reason}`}
 </p>
 <div className="flex gap-2 items-center text-[9px] text-neutral-500">
 <span>Method: {log.method}</span>
 {log.status === 'Granted' && !log.checkOutTime && (
 <button
 onClick={() => handleManualCheckOut(log.id)}
 className="text-primary hover:text-primary-hover font-bold cursor-pointer"
 >
 • Check Out
 </button>
 )}
 {log.checkOutTime && (
 <span className="text-neutral-500">• Left at {log.checkOutTime}</span>
 )}
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 </div>

 {/* WALK-IN GUEST POPUP REGISTRATION MODAL */}
 {showGuestModal && (
 <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-scale-in">
 <div className="flex justify-between items-center">
 <h3 className="text-sm font-black text-neutral-900">Walk-in Guest Register</h3>
 <button onClick={() => setShowGuestModal(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">✕</button>
 </div>

 <form onSubmit={handleRegisterGuestSubmit} className="space-y-4 text-xs">
 <div className="space-y-1.5">
 <label className="text-neutral-600 font-semibold block">Guest Full Name</label>
 <input
 type="text"
 name="guestName"
 placeholder="Enter visitor name..."
 required
 className="w-full bg-white border border-neutral-200 p-3 rounded-xl text-neutral-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light transition-all"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-neutral-600 font-semibold block">Contact Phone Number</label>
 <input
 type="text"
 placeholder="e.g. 9847000000"
 required
 className="w-full bg-white border border-neutral-200 p-3 rounded-xl text-neutral-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light transition-all"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-neutral-600 font-semibold block">Purpose of Visit</label>
 <select
 name="guestPurpose"
 className="w-full bg-white border border-neutral-200 p-3 rounded-xl text-neutral-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light cursor-pointer transition-all"
 >
 <option value="Free Trial">Free Trial</option>
 <option value="Consultation">Sales Tour / Consultation</option>
 <option value="Paying Guest">Paying Guest Entry (₹200)</option>
 </select>
 </div>

 <button
 type="submit"
 className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-sm hover:shadow-[0_12px_40px_rgba(37,99,235,0.18)] hover:-translate-y-0.5 cursor-pointer"
 >
 Approve Guest Check-in
 </button>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}

// Suspense boundary mapping wrapper
export default function AttendanceTerminalPage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Loading checkin terminal engine...
 </div>
 }>
 <AttendanceTerminalContent />
 </Suspense>
 );
}
