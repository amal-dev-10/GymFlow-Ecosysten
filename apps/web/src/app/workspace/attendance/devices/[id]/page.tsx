'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Activity,
  Server,
  Zap,
  Users,
  Settings,
  ShieldAlert,
  Clock,
  RefreshCw,
  Power,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Monitor,
  Copy,
  Terminal,
  Cpu,
  Thermometer,
  HardDrive,
  Network
} from 'lucide-react';
import { devicesApi } from '../../../../../lib/api';
import { handleApiError } from '../../../../../lib/api/client';

const TABS = [
  { id: 'connection', label: 'Connection', icon: Activity },
  { id: 'members', label: 'Member Sync', icon: Users },
  { id: 'events', label: 'Event Logs', icon: Terminal },
  { id: 'configuration', label: 'Configuration', icon: Settings },
  { id: 'health', label: 'Health Status', icon: HeartPulseIcon },
];

function HeartPulseIcon(props: any) {
  return <Activity {...props} />;
}

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

function DeviceDetailsContent({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('connection');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: ['device', id],
    queryFn: () => devicesApi.get(id),
    refetchInterval: 10000,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['device', id, 'events'],
    queryFn: () => devicesApi.getEvents(id),
    enabled: activeTab === 'events',
    refetchInterval: 5000,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['device', id, 'members'],
    queryFn: () => devicesApi.getMembers(id),
    enabled: activeTab === 'members',
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => devicesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device', id] });
      showToast('Configuration updated');
    },
    onError: (err) => showToast(handleApiError(err), 'error'),
  });

  const syncMutation = useMutation({
    mutationFn: () => devicesApi.syncNow(id),
    onSuccess: () => {
      showToast('Sync triggered successfully');
      queryClient.invalidateQueries({ queryKey: ['device', id] });
    },
    onError: (err) => showToast(handleApiError(err), 'error'),
  });

  const testConnectionMutation = useMutation({
    mutationFn: () => devicesApi.testConnection(id),
    onSuccess: (data) => {
      if (data.status === 'ONLINE') {
        showToast(`Connection successful! Ping: ${data.ping}ms`, 'success');
      } else {
        showToast('Device is offline or unreachable.', 'error');
      }
    },
    onError: (err) => showToast(handleApiError(err), 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: () => devicesApi.remove(id),
    onSuccess: () => {
      router.push('/workspace/attendance/devices');
    },
    onError: (err) => showToast(handleApiError(err), 'error'),
  });

  if (deviceLoading) {
    return <div className="p-12 text-center text-xs text-neutral-500 animate-pulse">Loading device...</div>;
  }

  if (!device) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold text-neutral-900">Device not found</h2>
        <Link href="/workspace/attendance/devices" className="text-primary hover:underline text-sm mt-2 inline-block">
          Return to Devices
        </Link>
      </div>
    );
  }

  const isOnline = device.status === 'ONLINE';

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6 text-neutral-900 min-h-screen bg-background">
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
      <div className="flex items-center gap-3 mb-6">
        <Link href="/workspace/attendance/devices" className="p-2 bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl transition text-neutral-500 hover:text-neutral-900">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-neutral-900">{device.name}</h1>
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
              isOnline ? 'bg-success-light text-success' : device.status === 'ERROR' ? 'bg-danger-light text-danger' : 'bg-neutral-100 text-neutral-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-success animate-pulse' : device.status === 'ERROR' ? 'bg-danger' : 'bg-neutral-400'}`} />
              {device.status}
            </span>
          </div>
          <p className="text-neutral-500 text-xs mt-1">
            {device.vendor} {device.model ? `• ${device.model}` : ''} • Branch: {device.gym?.name || 'Unknown'}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => testConnectionMutation.mutate()}
            disabled={testConnectionMutation.isPending}
            className="px-3 py-2 bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700 text-xs font-bold rounded-xl transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Activity className="w-4 h-4 text-primary" />
            <span>Test Connection</span>
          </button>
          
          <button
            onClick={() => {
              if (window.confirm('Disable this device? It will no longer process events.')) {
                updateMutation.mutate({ status: 'OFFLINE' });
              }
            }}
            className="p-2 bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-500 hover:text-neutral-900 rounded-xl transition cursor-pointer"
            title="Disable Device"
          >
            <Power className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (window.confirm('Delete this device permanently? This action cannot be undone.')) {
                removeMutation.mutate();
              }
            }}
            className="p-2 bg-white border border-neutral-200 hover:border-danger hover:bg-danger-light text-danger rounded-xl transition cursor-pointer"
            title="Delete Device"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Nav */}
        <div className="w-full md:w-[220px] flex-shrink-0 flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left whitespace-nowrap ${
                  active ? 'bg-primary text-white shadow-md' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0 bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm">
          
          {/* CONNECTION TAB */}
          {activeTab === 'connection' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-lg font-black text-neutral-900">Connection Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-1 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Device ID</div>
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-neutral-200">
                    <code className="text-xs text-neutral-900 font-mono">{device.id}</code>
                    <button onClick={() => { navigator.clipboard.writeText(device.id); showToast('Copied'); }} className="text-neutral-400 hover:text-primary"><Copy size={14}/></button>
                  </div>
                </div>

                <div className="space-y-1 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Device Key (Masked)</div>
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-neutral-200">
                    <code className="text-xs text-neutral-400 font-mono">••••••••••••••••••••••••</code>
                    <span className="text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">Hidden</span>
                  </div>
                </div>

                <div className="space-y-1 bg-neutral-50 p-4 rounded-2xl border border-neutral-100 md:col-span-2">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Webhook URL</div>
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-neutral-200">
                    <code className="text-xs text-neutral-900 font-mono break-all">{device.webhookUrl || 'https://api.gymflow.com/v1/devices/events'}</code>
                    <button onClick={() => { navigator.clipboard.writeText(device.webhookUrl || ''); showToast('Copied'); }} className="text-neutral-400 hover:text-primary ml-3"><Copy size={14}/></button>
                  </div>
                </div>
              </div>

              <hr className="border-neutral-100" />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Last Heartbeat</div>
                  <div className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                    <Clock size={14} className="text-neutral-400" />
                    {relativeTime(device.lastHeartbeat)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">IP Address</div>
                  <div className="text-sm font-bold text-neutral-900">{device.ipAddress || '—'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Firmware Version</div>
                  <div className="text-sm font-bold text-neutral-900">{device.version || '—'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Serial Number</div>
                  <div className="text-sm font-bold text-neutral-900">{device.serialNumber || '—'}</div>
                </div>
              </div>
            </div>
          )}

          {/* MEMBER SYNC TAB */}
          {activeTab === 'members' && (
            <div className="space-y-6 animate-fade-in flex flex-col h-full">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-black text-neutral-900">Synced Members</h2>
                <button
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                  <span>Sync Now</span>
                </button>
              </div>

              <div className="bg-neutral-50 p-4 rounded-xl flex gap-6 border border-neutral-100">
                <div>
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Total Synced</div>
                  <div className="text-2xl font-black text-neutral-900">{members.length}</div>
                </div>
                <div className="w-px bg-neutral-200"></div>
                <div>
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Last Sync</div>
                  <div className="text-sm font-bold text-neutral-900 mt-2">{relativeTime(device.lastSync)}</div>
                </div>
              </div>

              {membersLoading ? (
                <div className="p-8 text-center text-xs text-neutral-500">Loading members...</div>
              ) : members.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500 border border-dashed border-neutral-200 rounded-2xl">
                  No members synced yet. Try clicking "Sync Now".
                </div>
              ) : (
                <div className="overflow-auto border border-neutral-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3 border-b border-neutral-200">Member</th>
                        <th className="px-4 py-3 border-b border-neutral-200">Ext. ID</th>
                        <th className="px-4 py-3 border-b border-neutral-200">Credentials</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {members.map((m: any) => (
                        <tr key={m.mappingId} className="hover:bg-neutral-50/50">
                          <td className="px-4 py-3">
                            <div className="font-bold text-neutral-900">{m.name}</div>
                            <div className="text-neutral-500">{m.email}</div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[10px] text-neutral-600">
                            {m.externalUserId}
                          </td>
                          <td className="px-4 py-3 text-[10px]">
                            <div className="flex gap-2">
                              {m.fingerprintId && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">Fingerprint</span>}
                              {m.cardId && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100">RFID Card</span>}
                              {m.faceId && <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-100">Face</span>}
                              {!m.fingerprintId && !m.cardId && !m.faceId && <span className="text-neutral-400">—</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* EVENT LOGS TAB */}
          {activeTab === 'events' && (
            <div className="space-y-4 animate-fade-in flex flex-col h-full">
              <h2 className="text-lg font-black text-neutral-900">Event Logs</h2>
              <p className="text-xs text-neutral-500">Recent raw events and activity from this device.</p>
              
              {eventsLoading ? (
                <div className="p-8 text-center text-xs text-neutral-500">Loading events...</div>
              ) : events.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500 border border-dashed border-neutral-200 rounded-2xl">
                  No events recorded yet.
                </div>
              ) : (
                <div className="overflow-auto border border-neutral-200 rounded-xl flex-1 max-h-[500px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 border-b border-neutral-200">Timestamp</th>
                        <th className="px-4 py-3 border-b border-neutral-200">Event Type</th>
                        <th className="px-4 py-3 border-b border-neutral-200">Status</th>
                        <th className="px-4 py-3 border-b border-neutral-200">Payload Overview</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {events.map((ev: any) => (
                        <tr key={ev.id} className="hover:bg-neutral-50/50">
                          <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">
                            {new Date(ev.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-neutral-800 bg-neutral-100 px-2 py-1 rounded text-[10px]">{ev.type}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${ev.status === 'PROCESSED' ? 'bg-success' : ev.status === 'FAILED' ? 'bg-danger' : 'bg-warning'}`}></span>
                            <span className="text-[10px] font-bold text-neutral-600">{ev.status}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[10px] text-neutral-500 truncate max-w-xs">
                            {JSON.stringify(ev.rawPayload)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CONFIGURATION TAB */}
          {activeTab === 'configuration' && (
            <div className="space-y-6 animate-fade-in max-w-xl">
              <h2 className="text-lg font-black text-neutral-900">Device Configuration</h2>
              
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">Heartbeat Interval (seconds)</label>
                  <input 
                    type="number" 
                    defaultValue={device.configuration?.heartbeatInterval || 60}
                    className="w-full bg-white border border-neutral-200 p-2.5 rounded-xl text-neutral-900 focus:border-primary text-xs" 
                  />
                  <p className="text-[10px] text-neutral-500">How often the device pings GymFlow to report its online status.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">Timezone</label>
                  <select className="w-full bg-white border border-neutral-200 p-2.5 rounded-xl text-neutral-900 focus:border-primary text-xs">
                    <option value="UTC">UTC</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
                  <div>
                    <div className="text-xs font-bold text-neutral-900">Auto Sync Members</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">Automatically push new members to this device</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={device.configuration?.autoSync !== false} className="sr-only peer" />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
                  <div>
                    <div className="text-xs font-bold text-neutral-900">Real-time Event Sync</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">Stream check-ins and door events instantly</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={device.configuration?.eventSync !== false} className="sr-only peer" />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <button
                  onClick={() => showToast('Configuration saved (demo)')}
                  className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          )}

          {/* HEALTH TAB */}
          {activeTab === 'health' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-black text-neutral-900">Hardware Health</h2>
                <div className="text-[10px] text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                  Live Telemetry
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white border border-neutral-200 p-5 rounded-2xl">
                  <div className="text-neutral-500 mb-3"><Cpu size={24} strokeWidth={1.5}/></div>
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">CPU Usage</div>
                  <div className="text-2xl font-black text-neutral-900">{device.health?.cpu || 'N/A'}</div>
                </div>

                <div className="bg-white border border-neutral-200 p-5 rounded-2xl">
                  <div className="text-neutral-500 mb-3"><Activity size={24} strokeWidth={1.5}/></div>
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Memory</div>
                  <div className="text-2xl font-black text-neutral-900">{device.health?.memory || 'N/A'}</div>
                </div>

                <div className="bg-white border border-neutral-200 p-5 rounded-2xl">
                  <div className="text-neutral-500 mb-3"><HardDrive size={24} strokeWidth={1.5}/></div>
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Storage</div>
                  <div className="text-2xl font-black text-neutral-900">{device.health?.storage || 'N/A'}</div>
                </div>

                <div className="bg-white border border-neutral-200 p-5 rounded-2xl">
                  <div className="text-neutral-500 mb-3"><Thermometer size={24} strokeWidth={1.5}/></div>
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Temperature</div>
                  <div className="text-2xl font-black text-neutral-900">{device.health?.temperature || 'N/A'}</div>
                </div>

                <div className="bg-white border border-neutral-200 p-5 rounded-2xl">
                  <div className="text-neutral-500 mb-3"><Network size={24} strokeWidth={1.5}/></div>
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Network Quality</div>
                  <div className={`text-2xl font-black ${device.health?.network ? 'text-neutral-900' : 'text-neutral-500'}`}>
                    {device.health?.network || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function DeviceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  return (
    <Suspense fallback={<div className="p-12 text-center animate-pulse">Loading view...</div>}>
      <DeviceDetailsContent id={resolvedParams.id} />
    </Suspense>
  );
}
