'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Settings2,
  Network,
  Monitor,
  Copy,
  Search,
  Filter,
  ChevronRight,
  Activity,
  Zap,
  ServerOff
} from 'lucide-react';
import { gymApi, devicesApi } from '../../../../lib/api';
import { handleApiError } from '../../../../lib/api/client';
import AttendanceTabs from '../AttendanceTabs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type DeviceType = 'QR_SCANNER' | 'FINGERPRINT' | 'RFID' | 'FACE_CAMERA' | 'TURNSTILE' | 'BARCODE';
type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'ERROR';
type DeviceVendor = 'ZKTECO' | 'ESSL' | 'SUPREMA' | 'HIKVISION' | 'CUSTOM';

interface ApiDevice {
  id: string;
  name: string;
  type: DeviceType;
  vendor: DeviceVendor;
  model: string | null;
  serialNumber: string | null;
  ipAddress: string | null;
  deviceKey: string | null;
  webhookUrl: string | null;
  description: string | null;
  status: DeviceStatus;
  lastHeartbeat: string | null;
  lastSeen: string | null;
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
    case 'QR_SCANNER': return Monitor; // Fallback, could import QrCode
    case 'FINGERPRINT': return Monitor; // Fallback, could import Cpu
    case 'RFID': return Monitor; // Fallback, could import CreditCard
    case 'FACE_CAMERA': return Monitor; // Fallback, could import Camera
    case 'TURNSTILE': return Monitor; // Fallback, could import ScanLine
    case 'BARCODE': return Monitor; // Fallback, could import ScanLine
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
  const router = useRouter();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<DeviceStatus | 'ALL'>('ALL');
  const [filterVendor, setFilterVendor] = useState<DeviceVendor | 'ALL'>('ALL');
  const [filterBranch, setFilterBranch] = useState<string>('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  
  // Add Form State
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<DeviceType>('QR_SCANNER');
  const [newBranch, setNewBranch] = useState('');
  const [newVendor, setNewVendor] = useState<DeviceVendor>('ZKTECO');
  const [newModel, setNewModel] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [newIpAddress, setNewIpAddress] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Registration Success Modal
  const [showDeviceKeyModal, setShowDeviceKeyModal] = useState(false);
  const [generatedDevice, setGeneratedDevice] = useState<ApiDevice | null>(null);

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
    queryKey: ['devices', 'admin'],
    queryFn: () => devicesApi.list(),
    enabled: !branchesLoading,
    refetchInterval: 30_000,
  });

  const invalidateDevices = () => queryClient.invalidateQueries({ queryKey: ['devices'] });

  const createMutation = useMutation({
    mutationFn: (payload: any) => devicesApi.create(payload),
    onSuccess: (data: any) => {
      invalidateDevices();
      setShowAddModal(false);
      
      // Reset form
      setNewName('');
      setNewModel('');
      setNewSerialNumber('');
      setNewIpAddress('');
      setNewDescription('');

      if (data?.device) {
        setGeneratedDevice(data.device);
        setShowDeviceKeyModal(true);
      } else {
        showToast('Device registered successfully.');
      }
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
    createMutation.mutate({ 
      gymId: newBranch, 
      name: newName, 
      type: newType, 
      vendor: newVendor, 
      model: newModel, 
      serialNumber: newSerialNumber, 
      ipAddress: newIpAddress,
      description: newDescription
    });
  };

  // Filter and Search logic
  const filteredDevices = useMemo(() => {
    return devices.filter(dev => {
      // Branch filter
      if (filterBranch !== 'ALL' && dev.gymId !== filterBranch) return false;
      // Status filter
      if (filterStatus !== 'ALL' && dev.status !== filterStatus) return false;
      // Vendor filter
      if (filterVendor !== 'ALL' && dev.vendor !== filterVendor) return false;
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const bName = dev.gymName || branches.find(b => b.id === dev.gymId)?.name || '';
        if (
          !dev.name.toLowerCase().includes(query) &&
          !bName.toLowerCase().includes(query) &&
          !dev.vendor.toLowerCase().includes(query) &&
          !(dev.model || '').toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [devices, filterBranch, filterStatus, filterVendor, searchQuery, branches]);

  // Dashboard Stats
  const stats = useMemo(() => {
    return {
      total: devices.length,
      online: devices.filter(d => d.status === 'ONLINE').length,
      offline: devices.filter(d => d.status === 'OFFLINE').length,
      syncing: 0, // Placeholder if we map syncing state later
      error: devices.filter(d => d.status === 'ERROR').length,
    };
  }, [devices]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 text-neutral-900 min-h-screen bg-background">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl border text-xs shadow-2xl transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' ? 'bg-success-light border-green-200 text-success' : 'bg-danger-light border-red-200 text-danger'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-neutral-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-primary-light text-primary px-2.5 py-1 rounded-full uppercase tracking-wider">Access Control</span>
            <span className="text-xs font-bold bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full">Device Management</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900 mt-1">Biometric Devices</h1>
          <p className="text-neutral-600 text-xs mt-0.5">Register, monitor, and manage access devices across all branches.</p>
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
              if (branches.length > 0 && !newBranch) setNewBranch(branches[0].id);
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Device</span>
          </button>
        </div>
      </div>

      <AttendanceTabs />

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-neutral-200 p-4 rounded-2xl flex flex-col justify-center">
          <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><Monitor size={12}/> Total Devices</div>
          <div className="text-2xl font-black text-neutral-900">{stats.total}</div>
        </div>
        <div className="bg-success-light/30 border border-success/20 p-4 rounded-2xl flex flex-col justify-center">
          <div className="text-success text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><Activity size={12}/> Online</div>
          <div className="text-2xl font-black text-success">{stats.online}</div>
        </div>
        <div className="bg-neutral-100 border border-neutral-200 p-4 rounded-2xl flex flex-col justify-center">
          <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><ServerOff size={12}/> Offline</div>
          <div className="text-2xl font-black text-neutral-600">{stats.offline}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex flex-col justify-center">
          <div className="text-blue-600 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><RefreshCw size={12}/> Syncing</div>
          <div className="text-2xl font-black text-blue-700">{stats.syncing}</div>
        </div>
        <div className="bg-danger-light/30 border border-danger/20 p-4 rounded-2xl flex flex-col justify-center">
          <div className="text-danger text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><AlertTriangle size={12}/> Needs Attention</div>
          <div className="text-2xl font-black text-danger">{stats.error}</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center bg-neutral-50 border border-neutral-200 p-3 rounded-2xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search by device, branch, vendor..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-neutral-200 pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-primary transition"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="bg-white border border-neutral-200 px-3 py-2 rounded-xl text-xs text-neutral-700 focus:outline-none focus:border-primary flex-1 md:w-[130px] cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
            <option value="ERROR">Error</option>
          </select>
          
          <select 
            value={filterVendor}
            onChange={e => setFilterVendor(e.target.value as any)}
            className="bg-white border border-neutral-200 px-3 py-2 rounded-xl text-xs text-neutral-700 focus:outline-none focus:border-primary flex-1 md:w-[130px] cursor-pointer"
          >
            <option value="ALL">All Vendors</option>
            <option value="ZKTECO">ZKTeco</option>
            <option value="ESSL">eSSL</option>
            <option value="SUPREMA">Suprema</option>
            <option value="HIKVISION">Hikvision</option>
            <option value="CUSTOM">Custom</option>
          </select>
          
          <select 
            value={filterBranch}
            onChange={e => setFilterBranch(e.target.value)}
            className="bg-white border border-neutral-200 px-3 py-2 rounded-xl text-xs text-neutral-700 focus:outline-none focus:border-primary flex-1 md:w-[130px] cursor-pointer"
          >
            <option value="ALL">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Device List Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
        {devicesLoading ? (
          <div className="p-8 text-center text-xs text-neutral-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            Loading devices...
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500">
            <Monitor className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
            <p className="font-bold text-neutral-700 text-sm">No devices found</p>
            <p className="mt-1">Try adjusting your filters or register a new device.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="px-4 py-3 border-b border-neutral-200">Device</th>
                  <th className="px-4 py-3 border-b border-neutral-200">Vendor / Model</th>
                  <th className="px-4 py-3 border-b border-neutral-200">Branch</th>
                  <th className="px-4 py-3 border-b border-neutral-200">Status</th>
                  <th className="px-4 py-3 border-b border-neutral-200">Last Seen</th>
                  <th className="px-4 py-3 border-b border-neutral-200 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredDevices.map(dev => {
                  const Icon = deviceIconFor(dev.type);
                  const isOnline = dev.status === 'ONLINE';
                  return (
                    <tr key={dev.id} className="hover:bg-neutral-50/50 transition group cursor-pointer" onClick={() => router.push(`/workspace/attendance/devices/${dev.id}`)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isOnline ? 'bg-success-light text-success' : 'bg-neutral-100 text-neutral-500'}`}>
                            <Icon size={14} />
                          </div>
                          <div>
                            <div className="font-bold text-neutral-900">{dev.name}</div>
                            <div className="text-[10px] text-neutral-500 uppercase">{dev.id.substring(0,8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-neutral-800">{dev.vendor}</div>
                        <div className="text-[10px] text-neutral-500">{dev.model || 'Unknown Model'}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-700">
                        {dev.gymName || branches.find(b => b.id === dev.gymId)?.name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          isOnline ? 'bg-success-light text-success' : dev.status === 'ERROR' ? 'bg-danger-light text-danger' : 'bg-neutral-100 text-neutral-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-success animate-pulse' : dev.status === 'ERROR' ? 'bg-danger' : 'bg-neutral-400'}`} />
                          {dev.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {relativeTime(dev.lastSeen || dev.lastHeartbeat)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Remove device "${dev.name}"? This cannot be undone.`)) {
                              removeMutation.mutate(dev.id);
                            }
                          }}
                          className="p-1.5 text-neutral-400 hover:text-danger hover:bg-danger-light rounded-lg transition inline-flex"
                          title="Delete Device"
                        >
                          <Trash2 size={14} />
                        </button>
                        <ChevronRight className="w-4 h-4 text-neutral-300 inline-block ml-2 group-hover:text-primary transition" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD DEVICE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-[9999] animate-fade-in flex items-center justify-center p-4">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-500 block font-sans">Vendor</label>
                  <select
                    value={newVendor}
                    onChange={e => setNewVendor(e.target.value as DeviceVendor)}
                    className="w-full bg-white border border-neutral-200 p-2.5 rounded-xl text-neutral-800 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light transition-all cursor-pointer"
                  >
                    <option value="ZKTECO">ZKTeco</option>
                    <option value="ESSL">eSSL</option>
                    <option value="SUPREMA">Suprema</option>
                    <option value="HIKVISION">Hikvision</option>
                    <option value="CUSTOM">Custom/Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-500 block font-sans">IP Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 192.168.1.100"
                    value={newIpAddress}
                    onChange={e => setNewIpAddress(e.target.value)}
                    className="w-full bg-white border border-neutral-200 p-2.5 rounded-xl text-neutral-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-500 block font-sans">Model</label>
                  <input
                    type="text"
                    placeholder="e.g. F22"
                    value={newModel}
                    onChange={e => setNewModel(e.target.value)}
                    className="w-full bg-white border border-neutral-200 p-2.5 rounded-xl text-neutral-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-500 block font-sans">Serial No.</label>
                  <input
                    type="text"
                    placeholder="Serial number"
                    value={newSerialNumber}
                    onChange={e => setNewSerialNumber(e.target.value)}
                    className="w-full bg-white border border-neutral-200 p-2.5 rounded-xl text-neutral-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light transition-all"
                  />
                </div>
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

              <div className="space-y-1">
                <label className="text-neutral-500 block font-sans">Description (Optional)</label>
                <textarea
                  placeholder="Additional details..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full bg-white border border-neutral-200 p-2.5 rounded-xl text-neutral-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary-light transition-all resize-none h-16"
                />
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

      {/* REGISTRATION SUCCESS / DEVICE KEY MODAL */}
      {showDeviceKeyModal && generatedDevice && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-[9999] animate-fade-in flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle className="text-success w-4 h-4" /> Registration Successful
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-neutral-600 font-sans leading-relaxed">
                Your device has been securely registered. You must configure the physical device using the credentials below.
                <br /><strong className="text-danger mt-1 block">The Device Key will not be shown again.</strong>
              </p>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Device ID</label>
                <div className="bg-neutral-50 border border-neutral-200 p-3 rounded-xl flex justify-between items-center group">
                  <code className="text-neutral-900 font-mono text-xs">{generatedDevice.id}</code>
                  <button onClick={() => { navigator.clipboard.writeText(generatedDevice.id); showToast('ID copied!'); }} className="text-neutral-400 hover:text-primary transition"><Copy size={14}/></button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Webhook URL</label>
                <div className="bg-neutral-50 border border-neutral-200 p-3 rounded-xl flex justify-between items-center group">
                  <code className="text-neutral-900 font-mono text-[10px] break-all">{generatedDevice.webhookUrl || 'https://api.gymflow.com/v1/devices/events'}</code>
                  <button onClick={() => { navigator.clipboard.writeText(generatedDevice.webhookUrl || ''); showToast('Webhook copied!'); }} className="text-neutral-400 hover:text-primary transition ml-2"><Copy size={14}/></button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Device Key (Secret)</label>
                <div className="bg-success-light/30 border border-success/30 p-3 rounded-xl flex justify-between items-center group">
                  <code className="text-neutral-900 font-mono text-[11px] font-bold select-all break-all">{generatedDevice.deviceKey}</code>
                  <button onClick={() => { navigator.clipboard.writeText(generatedDevice.deviceKey || ''); showToast('Key copied!'); }} className="text-success hover:text-green-700 transition ml-2"><Copy size={14}/></button>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowDeviceKeyModal(false);
                  router.push(`/workspace/attendance/devices/${generatedDevice.id}`);
                }}
                className="w-full py-2.5 bg-neutral-900 hover:bg-black text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                Go to Device Details <ChevronRight size={14} />
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
        Loading device dashboard...
      </div>
    }>
      <DevicesManagementContent />
    </Suspense>
  );
}
