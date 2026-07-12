'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  RefreshCw,
  LogOut,
  MapPin,
  Building,
  ArrowRight,
  ShieldCheck,
  LayoutDashboard,
  X,
  Navigation,
  CreditCard
} from 'lucide-react';
import { orgApi, gymApi } from '../../lib/api';
import { handleApiError } from '../../lib/api/client';
import { useBrand } from '../../hooks/useBrand';

interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  gyms: any[];
  myRole: string | null;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const { brand, logoUrl: brandLogoUrl, faviconUrl, initials: brandInitials } = useBrand();
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [workspaces, setWorkspaces] = useState<OrganizationItem[]>([]);
  const [userName, setUserName] = useState('');

  // Gym Creation Modal States
  const [gymModalOpen, setGymModalOpen] = useState(false);
  const [selectedOrgForGym, setSelectedOrgForGym] = useState<{ id: string; name: string } | null>(null);
  const [gymName, setGymName] = useState('');
  const [gymAddress, setGymAddress] = useState('');
  const [gymPhone, setGymPhone] = useState('');
  const [gymLat, setGymLat] = useState('37.7749');
  const [gymLng, setGymLng] = useState('-122.4194');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Toast Notification States
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Instantiates Leaflet only on Client-Side runtime inside Modal
  useEffect(() => {
    if (gymModalOpen && typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        const mapElement = document.getElementById('modal-map-picker');
        if (!mapElement) return;

        // Reset previous instances if present
        const container = L.DomUtil.get('modal-map-picker');
        if (container) {
          (container as any)._leaflet_id = null;
        }

        const currentLat = parseFloat(gymLat) || 37.7749;
        const currentLng = parseFloat(gymLng) || -122.4194;

        const map = L.map('modal-map-picker').setView([currentLat, currentLng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        const marker = L.marker([currentLat, currentLng], {
          draggable: true
        }).addTo(map);

        const updateCoords = (lat: number, lng: number) => {
          setGymLat(lat.toFixed(6));
          setGymLng(lng.toFixed(6));
        };

        // Handle marker drag
        marker.on('dragend', () => {
          const position = marker.getLatLng();
          updateCoords(position.lat, position.lng);
        });

        // Handle map click
        map.on('click', (e) => {
          marker.setLatLng(e.latlng);
          updateCoords(e.latlng.lat, e.latlng.lng);
        });

        // Reference map to window for geolocation updates
        (window as any).modalGymflowMap = map;
        (window as any).modalGymflowMarker = marker;
      });
    }
  }, [gymModalOpen]);

  const handleUseCurrentLocation = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setGymLat(latitude.toFixed(6));
          setGymLng(longitude.toFixed(6));
          setGymAddress(`Current Location (Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);

          // Update Leaflet marker and view
          const map = (window as any).modalGymflowMap;
          const marker = (window as any).modalGymflowMarker;
          if (map && marker) {
            map.setView([latitude, longitude], 15);
            marker.setLatLng([latitude, longitude]);
          }
        },
        (error) => {
          showToast(`Error retrieving location: ${error.message}`, 'error');
        }
      );
    } else {
      showToast('Geolocation is not supported by this browser.', 'error');
    }
  };

  useEffect(() => {
    const fetchUserAndOrgs = async () => {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth?mode=login');
        return;
      }

      // Try reading user info
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          setUserName(userObj.fullName || userObj.phoneNumber || 'Gym Owner');
        } catch (_) { }
      }

      try {
        setLoading(true);
        const data = await orgApi.list();
        setWorkspaces(data);

        // If they have no organizations, redirect to onboarding to create one
        if (!data || data.length === 0) {
          router.push('/onboarding');
        }
      } catch (err: any) {
        console.error('Error fetching organizations:', err);
        if (err?.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/auth?mode=login');
        } else {
          setErrorMsg(handleApiError(err));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndOrgs();
  }, [router]);

  const handleSelectWorkspace = (orgId: string, name: string) => {
    if (typeof window === 'undefined') return;

    const org = workspaces.find(w => w.id === orgId);
    if (!org) return;

    if (!org.gyms || org.gyms.length === 0) {
      setSelectedOrgForGym({ id: orgId, name });
      setGymName('');
      setGymAddress('');
      setGymPhone('');
      setModalError('');
      setGymModalOpen(true);
      return;
    }

    setSelectingId(orgId);

    // Store selected organization context. Reset the gym selection so a branch
    // chosen in a previously-active org doesn't carry over into this one — its
    // gyms are different, so the sidebar selector must start at "All Gyms".
    localStorage.setItem('organizationId', orgId);
    localStorage.setItem('organizationName', name);
    localStorage.setItem('activeGymName', 'All Gyms');

    // Simulate entry transition
    showToast(`Welcome to ${name} - Workspace loaded successfully!`, 'success');
    setTimeout(() => {
      setSelectingId(null);
      router.push(`/workspace/dashboard?orgId=${orgId}`);
    }, 1500);
  };

  const handleCreateGymSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgForGym || !gymName || !gymAddress) return;
    setModalLoading(true);
    setModalError('');

    try {
      await gymApi.create({
        organizationId: selectedOrgForGym.id,
        name: gymName,
        address: gymAddress,
        latitude: parseFloat(gymLat) || null,
        longitude: parseFloat(gymLng) || null,
        contactPhone: gymPhone || undefined,
      });

      // Update workspace list locally to show branch count incremented
      const updated = workspaces.map(w => {
        if (w.id === selectedOrgForGym.id) {
          return {
            ...w,
            gyms: [...(w.gyms || []), { name: gymName }]
          };
        }
        return w;
      });
      setWorkspaces(updated);

      // Save context (reset gym selection — see handleSelectOrg above)
      localStorage.setItem('organizationId', selectedOrgForGym.id);
      localStorage.setItem('organizationName', selectedOrgForGym.name);
      localStorage.setItem('activeGymName', 'All Gyms');

      setGymModalOpen(false);

      showToast(`Welcome to ${selectedOrgForGym.name} - Branch configured successfully!`, 'success');
      setTimeout(() => {
        router.push(`/workspace/dashboard?orgId=${selectedOrgForGym.id}`);
      }, 1500);
    } catch (err: any) {
      setModalError(handleApiError(err));
    } finally {
      setModalLoading(false);
    }
  };

  const handleSignOut = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('organizationId');
    localStorage.removeItem('organizationName');
    router.push('/auth?mode=login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-neutral-900 font-sans relative overflow-hidden py-16 px-6 select-none animate-pulse">
        {/* Background Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-full pointer-events-none overflow-hidden z-0">
        </div>

        <div className="max-w-6xl mx-auto relative z-10 space-y-12">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between border-b border-neutral-100 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-200" />
              <div className="space-y-1.5">
                <div className="h-4 w-24 bg-neutral-50 rounded" />
                <div className="h-3 w-32 bg-neutral-50 rounded" />
              </div>
            </div>
            <div className="h-9 w-24 bg-neutral-50 rounded-xl border border-neutral-200" />
          </div>

          {/* Title Text Skeleton */}
          <div className="space-y-2">
            <div className="h-7 w-56 bg-neutral-50 rounded-md" />
            <div className="h-4 w-96 bg-neutral-50 rounded-md" />
          </div>

          {/* Cards Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, idx) => (
              <div
                key={idx}
                className="bg-white border border-neutral-200 rounded-3xl p-6 min-h-[200px] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-50 border border-neutral-200" />
                    <div className="w-16 h-5 rounded-full bg-neutral-50 border border-neutral-200 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-40 bg-neutral-50 rounded-md" />
                    <div className="h-3.5 w-24 bg-neutral-50 rounded-md" />
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-100/60 flex items-center justify-between">
                  <div className="h-3.5 w-24 bg-neutral-50 rounded-md" />
                  <div className="h-4 w-28 bg-neutral-50 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-neutral-900 selection:bg-primary selection:text-primary font-sans relative overflow-hidden py-16 px-6">

      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-full pointer-events-none overflow-hidden z-0">
      </div>

      <div className="max-w-6xl mx-auto relative z-10">

        {/* Upper Header Bar */}
        <div className="flex items-center justify-between mb-12 border-b border-neutral-200/60 pb-6">
          <div className="flex items-center gap-3">
            {faviconUrl ? (
              <img src={faviconUrl} alt={brand.platformName} className="h-11 w-auto max-w-[200px] object-contain" />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md"
                style={{ backgroundColor: brand.primaryColor }}
              >
                {brandInitials}
              </div>
            )}
            <div>
              <h1 className="text-lg font-black text-neutral-900 leading-tight">{brand.platformName} <span className="text-xs font-medium text-neutral-600">HQ</span></h1>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Multi-Tenant Management</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <span className="block text-xs font-bold text-neutral-800">{userName}</span>
              <span className="block text-[10px] text-success font-bold">
                {Array.from(new Set(workspaces.map(w => w.myRole).filter(Boolean))).join(' · ') || 'Member Access'}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 hover:border-red-200 text-neutral-600 hover:text-danger transition-all flex items-center gap-2 text-xs font-bold cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Header Text */}
        <div className="text-center sm:text-left mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">Select your Workspace</h2>
          <p className="text-xs text-neutral-600 mt-2">Choose an organization to view financial dashboard, manage plans, and verify branches.</p>
          {workspaces.length > 0 && (
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-4 text-[11px] text-neutral-500 font-semibold">
              <span className="flex items-center gap-1.5">
                <Building2 size={12} className="text-primary" />
                {workspaces.length} organization{workspaces.length === 1 ? '' : 's'}
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-100" />
              <span className="flex items-center gap-1.5">
                <Building size={12} className="text-primary" />
                {workspaces.reduce((sum, w) => sum + (w.gyms?.length || 0), 0)} branch{workspaces.reduce((sum, w) => sum + (w.gyms?.length || 0), 0) === 1 ? '' : 'es'} total
              </span>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-danger-light border border-red-200 text-danger text-xs font-semibold max-w-md">
            {errorMsg}
          </div>
        )}

        {/* Organizations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((ws, index) => {
            const colors = [
              'bg-primary-light',
              'from-blue-500 to-indigo-600',
              'bg-success-light',
              'from-primary to-purple-600'
            ];
            const gradientColor = colors[index % colors.length];
            const branchCount = ws.gyms ? ws.gyms.length : 0;
            const needsSetup = branchCount === 0;

            return (
              <div
                key={ws.id}
                onClick={() => handleSelectWorkspace(ws.id, ws.name)}
                style={{ animationDelay: `${index * 60}ms` }}
                className="group relative bg-white border border-neutral-200/80 hover:border-primary/20 rounded-3xl p-6 shadow-xl transition-all duration-300 hover:translate-y-[-4px] cursor-pointer flex flex-col justify-between min-h-[200px] overflow-hidden animate-scale-in"
              >
                {/* Visual Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-light rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradientColor} flex items-center justify-center text-white font-extrabold text-base shadow-lg uppercase`}>
                      {ws.name.substring(0, 2)}
                    </div>
                    {needsSetup ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-warning-light border border-amber-200 px-2.5 py-1 rounded-full">
                        Setup Required
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-success bg-success-light border border-green-200 px-2.5 py-1 rounded-full">
                        <ShieldCheck size={11} />
                        Active
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold text-neutral-900 group-hover:text-neutral-900 transition-colors">{ws.name}</h3>
                  <p className="text-[11px] text-neutral-500 mt-1 select-none font-medium">gymflow.app/{ws.slug}</p>
                  {ws.myRole && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-neutral-700 bg-neutral-100/60 border border-neutral-200/60 px-2 py-0.5 rounded-full mt-2">
                      <ShieldCheck size={10} className="text-primary" />
                      {ws.myRole}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/organizations/${ws.id}/subscription`);
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 hover:text-primary transition-colors mt-2 cursor-pointer"
                  >
                    <CreditCard size={11} />
                    Manage Subscription
                  </button>
                </div>

                <div className="mt-6 pt-4 border-t border-neutral-200/50 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium">
                    <Building size={13} className="text-neutral-400" />
                    {needsSetup ? 'No branches yet' : `${branchCount} Gym Branch${branchCount === 1 ? '' : 'es'}`}
                  </span>

                  <span className="text-xs font-bold text-primary group-hover:text-primary transition-colors flex items-center gap-1.5">
                    {selectingId === ws.id ? (
                      <RefreshCw className="animate-spin" size={14} />
                    ) : (
                      <>
                        <LayoutDashboard size={13} />
                        <span>Enter Workspace</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Create New Org Card */}
          <div
            onClick={() => router.push('/onboarding?new=true')}
            className="group relative bg-white border border-dashed border-neutral-200/90 hover:border-primary/20 rounded-3xl p-6 transition-all duration-300 hover:bg-white cursor-pointer flex flex-col items-center justify-center text-center min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-600 group-hover:text-primary group-hover:border-primary/20 transition-all mb-4">
              <Plus size={20} />
            </div>
            <h3 className="text-xs font-bold text-neutral-700 group-hover:text-neutral-900 transition-colors">Create Another Organization</h3>
            <p className="text-[10px] text-neutral-500 mt-1.5 max-w-[200px] leading-relaxed">Add a separate brand or chain of gyms under your main account.</p>
          </div>
        </div>

      </div>

      {/* GYM CREATION MODAL OVERLAY */}
      {gymModalOpen && selectedOrgForGym && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background backdrop-blur-md animate-fade-in">
          <div className="fixed inset-0" onClick={() => setGymModalOpen(false)} />

          <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-3xl p-7 shadow-2xl relative z-10 animate-scale-up max-h-[90vh] overflow-y-auto scrollbar-thin">

            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-lg font-extrabold text-neutral-900">Configure First Branch</h3>
                <p className="text-[11px] text-neutral-600 mt-1">
                  Create a location branch for <b className="text-primary">{selectedOrgForGym.name}</b> before launching your workspace.
                </p>
              </div>
              <button
                onClick={() => setGymModalOpen(false)}
                className="text-neutral-500 hover:text-neutral-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-lg bg-danger-light border border-red-200 text-danger text-xs text-center font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateGymSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Branch Name</label>
                <input
                  required
                  type="text"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
                  placeholder="Technopark Branch"
                />
              </div>

              {/* Map selection */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Map Selection (Drag Pin or Click Map)</label>
                <div id="modal-map-picker" className="w-full h-36 rounded-xl border border-neutral-200 bg-neutral-50 mb-2 overflow-hidden z-10 relative" />
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="w-full py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 rounded-lg text-[10px] font-bold text-neutral-700 hover:text-neutral-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Navigation size={12} className="text-primary animate-pulse" />
                  <span>Use Current Location</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Latitude</label>
                  <input
                    required
                    type="text"
                    value={gymLat}
                    onChange={(e) => setGymLat(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Longitude</label>
                  <input
                    required
                    type="text"
                    value={gymLng}
                    onChange={(e) => setGymLng(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Base Address</label>
                <input
                  required
                  type="text"
                  value={gymAddress}
                  onChange={(e) => setGymAddress(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
                  placeholder="100 Pine Street, San Francisco, CA 94111"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Contact Phone</label>
                <input
                  required
                  type="tel"
                  value={gymPhone}
                  onChange={(e) => setGymPhone(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
                  placeholder="+1 (415) 555-0199"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGymModalOpen(false)}
                  className="flex-1 py-3.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-3.5 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {modalLoading ? <RefreshCw className="animate-spin" size={13} /> : <span>Create & Launch</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CUSTOM FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100] animate-slide-in flex items-center gap-3 p-4 bg-white backdrop-blur-md border border-neutral-200 rounded-2xl shadow-2xl max-w-sm">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-success shadow-lg ' :
            toast.type === 'error' ? 'bg-danger shadow-lg ' : 'bg-primary shadow-lg '
            }`} />
          <span className="text-xs font-bold text-neutral-900">{toast.message}</span>
        </div>
      )}

    </div>
  );
}
