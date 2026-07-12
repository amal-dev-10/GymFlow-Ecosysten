'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
 Radio,
 Plus,
 RefreshCw,
 Sliders,
 Trash2,
 CheckCircle,
 AlertTriangle,
 Cpu,
 Building,
 Settings2,
 Activity,
 Network,
 QrCode,
 CreditCard,
 Camera,
 ScanLine,
 Monitor
} from 'lucide-react';
import { gymApi, devicesApi } from '../../../../lib/api';
import { handleApiError } from '../../../../lib/api/client';
import AttendanceTabs from '../AttendanceTabs';

type DeviceType = 'QR_SCANNER' | 'FINGERPRINT' | 'RFID' | 'FACE_CAMERA' | 'TURNSTILE' | 'BARCODE';
type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'ERROR';

interface ApiDevice {
 id: string;
 name: string;
 type: DeviceType;
 status: DeviceStatus;
 lastHeartbeat: string | null;
 lastSync: string | null;
 version: string | null;
 gymId: string;
 gymName?: string;
 createdAt: string;
 updatedAt: string;
}

const DEVICE_TYPE_LABEL: Record<DeviceType, string> = {
 QR_SCANNER: 'QR Scanner',
 FINGERPRINT: 'Fingerprint Reader',
 RFID: 'RFID Reader',
 FACE_CAMERA: 'Face Recognition Camera',
 TURNSTILE: 'Turnstile',
 BARCODE: 'Barcode Scanner',
};

const deviceIconFor = (type: DeviceType) => {
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

function relativeTime(iso: string | null) {
 if (!iso) return 'Never';
 const diffMs = Date.now() - new Date(iso).getTime();
 const mins = Math.floor(diffMs / 60000);
 if (mins < 1) return 'Just now';
 if (mins < 60) return `${mins}m ago`;
 const hours = Math.floor(mins / 60);
 if (hours < 24) return `${hours}h ago`;
 return `${Math.floor(hours / 24)}d ago`;
}

function DevicesManagementContent() {
 const queryClient = useQueryClient();

 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
 const [branches, setBranches] = useState<any[]>([]);
 const [branchesLoading, setBranchesLoading] = useState(true);
 const [selectedBranchId, setSelectedBranchId] = useState('all');

 const [showAddModal, setShowAddModal] = useState(false);
 const [showConfigureModal, setShowConfigureModal] = useState(false);
 const [selectedDevice, setSelectedDevice] = useState<ApiDevice | null>(null);

 const [newName, setNewName] = useState('');
 const [newType, setNewType] = useState<DeviceType>('QR_SCANNER');
 const [newBranch, setNewBranch] = useState('');

 const [editName, setEditName] = useState('');
 const [editStatus, setEditStatus] = useState<DeviceStatus>('OFFLINE');

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 useEffect(() => {
 (async () => {
 try {
 setBranchesLoading(true);
 const orgId = localStorage.getItem('organizationId') || '';
 const branchList = await gymApi.list(orgId);
 setBranches(branchList || []);
 if (branchList?.length) setNewBranch(branchList[0].id);
 } catch (err) {
 console.error(err);
 showToast('Failed to load branch list', 'error');
 } finally {
 setBranchesLoading(false);
 }
 })();
 }, []);

 const {
 data: devices = [],
 isLoading: devicesLoading,
 refetch: refetchDevices,
 isFetching: devicesRefreshing,
 } = useQuery<ApiDevice[]>({
 queryKey: ['devices', 'admin', selectedBranchId],
 queryFn: () => devicesApi.list(selectedBranchId === 'all' ? undefined : selectedBranchId),
 enabled: !branchesLoading,
 refetchInterval: 30_000,
 });

 const invalidateDevices = () => queryClient.invalidateQueries({ queryKey: ['devices'] });

 const createMutation = useMutation({
 mutationFn: (payload: { gymId: string; name: string; type: DeviceType }) => devicesApi.create(payload),
 onSuccess: () => {
 invalidateDevices();
 setShowAddModal(false);
 setNewName('');
 showToast('Device registered successfully.');
 },
 onError: (err) => showToast(handleApiError(err), 'error'),
 });

 const updateMutation = useMutation({
 mutationFn: ({ id, payload }: { id: string; payload: { name?: string; status?: DeviceStatus } }) =>
 devicesApi.update(id, payload),
 onSuccess: () => {
 invalidateDevices();
 setShowConfigureModal(false);
 showToast('Device updated.');
 },
 onError: (err) => showToast(handleApiError(err), 'error'),
 });

 const removeMutation = useMutation({
 mutationFn: (id: string) => devicesApi.remove(id),
 onSuccess: () => {
 invalidateDevices();
 showToast('Device removed.');
 },
 onError: (err) => showToast(handleApiError(err), 'error'),
 });

 const handleAddDevice = (e: React.FormEvent) => {
 e.preventDefault();
 if (!newName || !newBranch) return;
 createMutation.mutate({ gymId: newBranch, name: newName, type: newType });
 };

 const openConfigureModal = (dev: ApiDevice) => {
 setSelectedDevice(dev);
 setEditName(dev.name);
 setEditStatus(dev.status);
 setShowConfigureModal(true);
 };

 const handleSaveConfig = () => {
 if (!selectedDevice) return;
 updateMutation.mutate({ id: selectedDevice.id, payload: { name: editName, status: editStatus } });
 };

 const filteredDevices = devices;

 return (
 <div className="p-6 max-w-[1600px] mx-auto space-y-6 text-neutral-900 min-h-screen bg-background">
 {/* Toast Alert */}
 {toast && (
 <div className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border text-xs shadow-2xl transition-all duration-300 transform translate-y-0 ${toast.type === 'success' ? 'bg-success-light border-green-200 text-success' : 'bg-danger-light border-red-200 text-danger'
 }`}>
 {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
 <span>{toast.message}</span>
 </div>
 )}

 {/* Header */}
 <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-neutral-100 pb-5">
 <div>
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold bg-primary-light text-primary px-2.5 py-1 rounded-full uppercase tracking-wider">Scanner terminals</span>
 <span className="text-xs font-bold bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full">Live Backend Devices</span>
 </div>
 <h1 className="text-2xl font-black tracking-tight text-neutral-900 mt-1">Access Device Manager</h1>
 <p className="text-neutral-600 text-xs mt-0.5">Biometric readers, RFID/QR scanners, turnstiles, and simulator devices registered to your branches.</p>
 </div>
 <div className="flex items-center gap-3 self-end md:self-center">
 <button
 onClick={() => refetchDevices()}
 disabled={devicesRefreshing}
 className="px-3.5 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition flex items-center gap-2 disabled:opacity-50"
 >
 <Network className={`w-4 h-4 text-primary ${devicesRefreshing ? 'animate-spin' : ''}`} />
 <span>Refresh</span>
 </button>
 <button
 onClick={() => {
 if (branches.length > 0) setNewBranch(branches[0].id);
 setShowAddModal(true);
 }}
 className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
 >
 <Plus className="w-4 h-4" />
 <span>Register Device</span>
 </button>
 </div>
 </div>

 <AttendanceTabs />

 {/* Grid count metrics */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {[
 { label: 'Total Registered', val: `${devices.length} Devices`, desc: 'Across selected scope', color: 'text-neutral-900', icon: Cpu },
 { label: 'Online', val: `${devices.filter(d => d.status === 'ONLINE').length} Devices`, desc: 'Heartbeat within 30s', color: 'text-success', icon: CheckCircle },
 { label: 'Errors', val: `${devices.filter(d => d.status === 'ERROR').length} Devices`, desc: 'Needs attention', color: 'text-danger', icon: AlertTriangle },
 { label: 'Branches Covered', val: `${new Set(devices.map(d => d.gymId)).size} locations`, desc: 'Monitored gyms', color: 'text-primary', icon: Building }
 ].map((kpi, idx) => (
 <div key={idx} className="bg-white border border-neutral-100 p-4.5 rounded-2xl flex flex-col justify-between hover:border-neutral-200 transition">
 <div className="flex justify-between items-start">
 <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block leading-tight">{kpi.label}</span>
 <kpi.icon className="w-3.5 h-3.5 text-neutral-400" />
 </div>
 <div className="mt-4">
 <span className={`text-base font-black ${kpi.color} block`}>{kpi.val}</span>
 <span className="text-[10px] text-neutral-500 block mt-0.5">{kpi.desc}</span>
 </div>
 </div>
 ))}
 </div>

 {/* Core table/cards view */}
 <div className="bg-white border border-neutral-100 p-5 rounded-3xl space-y-4">
 <div className="flex justify-between items-center pb-3 border-b border-neutral-100">
 <div>
 <h3 className="text-xs font-black text-neutral-800 uppercase">Registered Devices</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Live status pulled directly from the backend /v1/devices API.</p>
 </div>

 <select
 value={selectedBranchId}
 onChange={(e) => setSelectedBranchId(e.target.value)}
 className="bg-background border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light cursor-pointer transition-all"
 >
 <option value="all">All Locations</option>
 {branches.map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 </div>

 {devicesLoading || branchesLoading ? (
 <div className="p-12 text-center text-neutral-500 text-xs font-semibold flex flex-col items-center gap-3">
 <RefreshCw className="w-6 h-6 text-primary animate-spin" />
 Loading devices…
 </div>
 ) : filteredDevices.length === 0 ? (
 <div className="p-12 text-center text-neutral-500 text-xs font-semibold">
 <Sliders className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
 No devices registered under this branch filter selection.
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
 {filteredDevices.map(dev => {
 const Icon = deviceIconFor(dev.type);
 return (
 <div key={dev.id} className="bg-white border border-neutral-200 p-5 rounded-2xl space-y-4 flex flex-col justify-between hover:border-neutral-200 transition">
 <div className="space-y-3">
 <div className="flex justify-between items-start">
 <div className="flex items-start gap-2">
 <Icon className="w-4 h-4 text-neutral-500 mt-0.5" />
 <div>
 <span className="text-xs font-bold text-neutral-800 block">{dev.name}</span>
 <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">{DEVICE_TYPE_LABEL[dev.type]}</span>
 </div>
 </div>

 <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1 ${dev.status === 'ONLINE'
 ? 'bg-success-light text-success border border-green-200'
 : dev.status === 'ERROR'
 ? 'bg-danger-light text-danger border border-red-200'
 : 'bg-neutral-100/40 text-neutral-600 border border-neutral-200/40'
 }`}>
 <span className={`w-1.5 h-1.5 rounded-full ${dev.status === 'ONLINE' ? 'bg-success animate-pulse' : dev.status === 'ERROR' ? 'bg-danger' : 'bg-neutral-100'}`} />
 {dev.status}
 </span>
 </div>

 <div className="bg-neutral-50/60 border border-neutral-100 p-3.5 rounded-xl space-y-2 text-[10.5px] font-mono text-neutral-600">
 <div className="flex justify-between"><span>Branch:</span><span className="text-neutral-700 font-bold">{dev.gymName || branches.find(b => b.id === dev.gymId)?.name || '—'}</span></div>
 <div className="flex justify-between"><span>Last Heartbeat:</span><span>{relativeTime(dev.lastHeartbeat)}</span></div>
 <div className="flex justify-between"><span>Firmware/Version:</span><span>{dev.version || 'N/A'}</span></div>
 <div className="flex justify-between"><span>Device ID:</span><span className="text-neutral-500">{dev.id.substring(0, 8)}…</span></div>
 </div>
 </div>

 <div className="flex gap-2 border-t border-neutral-100/60 pt-3">
 <button
 onClick={() => openConfigureModal(dev)}
 className="flex-1 py-1.5 bg-neutral-50 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900 text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
 >
 <Settings2 size={13} />
 Manage
 </button>
 <button
 onClick={() => {
 if (window.confirm(`Remove device"${dev.name}"? This cannot be undone.`)) {
 removeMutation.mutate(dev.id);
 }
 }}
 className="p-1.5 bg-neutral-50 border border-neutral-200 hover:border-red-200 text-neutral-500 hover:text-danger rounded-lg transition cursor-pointer"
 title="Remove device"
 >
 <Trash2 size={13} />
 </button>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>

 {/* ADD DEVICE MODAL */}
 {showAddModal && (
 <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-50 animate-fade-in flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
 <div className="flex justify-between items-center">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Register New Device</h3>
 <button onClick={() => setShowAddModal(false)} className="text-neutral-500 hover:text-neutral-700 cursor-pointer">✕</button>
 </div>

 <form onSubmit={handleAddDevice} className="space-y-4 text-xs">
 <div className="space-y-1">
 <label className="text-neutral-600 block font-sans">Device Name</label>
 <input
 type="text"
 required
 placeholder="e.g. Front Gate Turnstile"
 className="w-full bg-white border border-neutral-200 p-2.5 rounded-xl text-neutral-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light transition-all"
 value={newName}
 onChange={e => setNewName(e.target.value)}
 />
 </div>

 <div className="space-y-1">
 <label className="text-neutral-500 block font-sans">Device Type</label>
 <select
 value={newType}
 onChange={e => setNewType(e.target.value as DeviceType)}
 className="w-full bg-white border border-neutral-200 p-2.5 rounded-xl text-neutral-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light transition-all cursor-pointer"
 >
 {(Object.keys(DEVICE_TYPE_LABEL) as DeviceType[]).map(t => (
 <option key={t} value={t}>{DEVICE_TYPE_LABEL[t]}</option>
 ))}
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-neutral-600 block font-sans">Branch</label>
 <select
 value={newBranch}
 onChange={e => setNewBranch(e.target.value)}
 className="w-full bg-white border border-neutral-200 p-2.5 rounded-xl text-neutral-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light transition-all cursor-pointer"
 >
 {branches.map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 </div>

 <button
 type="submit"
 disabled={createMutation.isPending}
 className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
 >
 {createMutation.isPending ? 'Registering…' : 'Complete Registration'}
 </button>
 </form>
 </div>
 </div>
 )}

 {/* CONFIGURE MODAL */}
 {showConfigureModal && selectedDevice && (
 <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-50 animate-fade-in flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
 <div className="flex justify-between items-center">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Manage Device</h3>
 <button onClick={() => setShowConfigureModal(false)} className="text-neutral-500 hover:text-neutral-700 cursor-pointer">✕</button>
 </div>

 <div className="space-y-4 text-xs">
 <div className="space-y-1">
 <label className="text-neutral-500 block font-sans">Device Name</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 p-2.5 rounded-xl text-neutral-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light transition-all"
 value={editName}
 onChange={e => setEditName(e.target.value)}
 />
 </div>

 <div className="space-y-1">
 <label className="text-neutral-600 block font-sans">Status</label>
 <select
 value={editStatus}
 onChange={e => setEditStatus(e.target.value as DeviceStatus)}
 className="w-full bg-white border border-neutral-200 p-2.5 rounded-xl text-neutral-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light transition-all cursor-pointer"
 >
 <option value="ONLINE">Online</option>
 <option value="OFFLINE">Offline</option>
 <option value="ERROR">Error</option>
 </select>
 </div>

 <div className="bg-neutral-50/60 border border-neutral-100 p-3 rounded-xl text-[10px] text-neutral-500 space-y-1">
 <div>Branch: <span className="text-neutral-700">{selectedDevice.gymName || '—'}</span></div>
 <div>Last Heartbeat: <span className="text-neutral-700">{relativeTime(selectedDevice.lastHeartbeat)}</span></div>
 <div>Registered: <span className="text-neutral-700">{new Date(selectedDevice.createdAt).toLocaleString()}</span></div>
 </div>

 <button
 onClick={handleSaveConfig}
 disabled={updateMutation.isPending}
 className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
 >
 {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

export default function DevicesPage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Loading devices manager...
 </div>
 }>
 <DevicesManagementContent />
 </Suspense>
 );
}
