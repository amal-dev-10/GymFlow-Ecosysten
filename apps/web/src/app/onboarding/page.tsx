'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
 Building2,
 MapPin,
 CheckCircle,
 Building,
 ArrowRight,
 ArrowLeft,
 Plus,
 RefreshCw,
 LayoutDashboard,
 Navigation,
 Globe,
 UploadCloud,
 Check,
 ChevronDown,
 Search,
 Dumbbell,
 Flame,
 Heart,
 Compass,
 Trophy,
 Layers,
 Sparkles,
 Phone,
 Mail,
 FileText,
 Settings,
 DollarSign,
 Clock,
 Calendar,
 X,
 LogOut
} from 'lucide-react';
import { orgApi, gymApi, authApi } from '../../lib/api';
import { handleApiError } from '../../lib/api/client';

interface OrganizationItem {
 id: string;
 name: string;
 slug: string;
 gyms: any[];
}

interface BusinessTypeOption {
 id: string;
 title: string;
 description: string;
 icon: React.ComponentType<any>;
}

export default function OnboardingPage() {
 const router = useRouter();
 const [step, setStep] = useState<'profile' | 'org' | 'gym' | 'success'>('org');
 const [orgSubStep, setOrgSubStep] = useState<'info' | 'contact' | 'address' | 'settings' | 'review'>('info');
 const [loading, setLoading] = useState(false);
 const [initLoading, setInitLoading] = useState(true);
 const [geocoding, setGeocoding] = useState(false);
 const [errorMsg, setErrorMsg] = useState('');

 // Toast Notification States
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

 const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
 setToast({ message, type });
 setTimeout(() => {
 setToast(null);
 }, 3000);
 };

 // Profile states
 const [profileFullName, setProfileFullName] = useState('');
 const [profileEmail, setProfileEmail] = useState('');

 // Loaded Workspaces list (if any exists)
 const [workspaces, setWorkspaces] = useState<OrganizationItem[]>([]);

 useEffect(() => {
 const checkAuthAndLoad = async () => {
 if (typeof window === 'undefined') return;
 const token = localStorage.getItem('token');
 if (!token) {
 router.push('/auth?mode=login');
 return;
 }

 try {
 setInitLoading(true);
 const data = await orgApi.list();
 setWorkspaces(data);

 // Retrieve user from localStorage
 const userStr = localStorage.getItem('user');
 const user = userStr ? JSON.parse(userStr) : null;
 if (user) {
 setProfileFullName(user.name || '');
 setProfileEmail(user.email || '');
 }

 const isCreatingNew = typeof window !== 'undefined' && window.location.search.includes('new=true');
 
 if (user && (!user.name || user.name === 'New User' || !user.email)) {
 setStep('profile');
 } else if (data && data.length > 0 && !isCreatingNew) {
 router.push('/organizations');
 return;
 } else {
 setStep('org');
 setOrgSubStep('info');
 }
 } catch (err: any) {
 console.error('Error loading workspaces:', err);
 if (err?.response?.status === 401) {
 localStorage.removeItem('token');
 localStorage.removeItem('user');
 router.push('/auth?mode=login');
 } else {
 setErrorMsg(handleApiError(err));
 }
 } finally {
 setInitLoading(false);
 }
 };

 checkAuthAndLoad();
 }, [router]);

 // --- FORM STATE ---
 
 // 1. Organization Information & Business Type
 const [orgName, setOrgName] = useState('');
 const [orgSlug, setOrgSlug] = useState('');
 const [businessType, setBusinessType] = useState('');
 const [logoUrl, setLogoUrl] = useState('');

 // 2. Contact Information
 const [phone, setPhone] = useState('');
 const [email, setEmail] = useState('');
 const [website, setWebsite] = useState('');

 // 3. Business Address
 const [addressLine1, setAddressLine1] = useState('');
 const [addressLine2, setAddressLine2] = useState('');
 const [city, setCity] = useState('');
 const [stateProv, setStateProv] = useState('');
 const [country, setCountry] = useState('United States');
 const [postalCode, setPostalCode] = useState('');

 // 4. Settings (Currency, Timezone, Date Format, Language)
 const [currency, setCurrency] = useState('USD');
 const [timezone, setTimezone] = useState('America/New_York');
 const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
 const [language, setLanguage] = useState('en');

 // Search/Dropdown overlay control states
 const [currencySearch, setCurrencySearch] = useState('');
 const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
 
 const [timezoneSearch, setTimezoneSearch] = useState('');
 const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);

 const [countrySearch, setCountrySearch] = useState('');
 const [showCountryDropdown, setShowCountryDropdown] = useState(false);

 // 5. Gym Address & Coordinates State (Step 3: Create Gym)
 const [gymName, setGymName] = useState('');
 const [gymLat, setGymLat] = useState('37.7749');
 const [gymLng, setGymLng] = useState('-122.4194');
 const [gymAddress, setGymAddress] = useState('');
 const [gymAddressDetails, setGymAddressDetails] = useState('');
 const [gymPhone, setGymPhone] = useState('');
 const [createdOrgId, setCreatedOrgId] = useState('');

 // Business Type options
 const businessTypes: BusinessTypeOption[] = [
 { id: 'gym', title: 'Gym', description: 'Traditional weight rooms, cardio, and general membership access.', icon: Dumbbell },
 { id: 'fitness_center', title: 'Fitness Center', description: 'Multi-purpose facility with pools, courts, and fitness classes.', icon: Heart },
 { id: 'crossfit', title: 'CrossFit Box', description: 'High-intensity functional training arena with barbell setups.', icon: Flame },
 { id: 'yoga', title: 'Yoga Studio', description: 'Mindfulness, hot yoga, pilates, and recovery session layouts.', icon: Compass },
 { id: 'martial_arts', title: 'Martial Arts Academy', description: 'Dojos, boxing rings, MMA setups, and belt progression trackers.', icon: Trophy },
 { id: 'personal_training', title: 'Personal Training Studio', description: 'Boutique personal trainers, coaching studios, and 1-on-1 focus.', icon: Sparkles },
 { id: 'sports_club', title: 'Sports Club', description: 'Athletic training associations, tennis, squash, or recreation clubs.', icon: Building },
 { id: 'other', title: 'Other', description: 'Wellness centers, physical therapy, or custom athletic models.', icon: Layers },
 ];

 // Helper lists for Settings Selectors
 const currencies = [
 { code: 'USD', name: 'US Dollar ($)' },
 { code: 'EUR', name: 'Euro (€)' },
 { code: 'GBP', name: 'British Pound (£)' },
 { code: 'CAD', name: 'Canadian Dollar ($)' },
 { code: 'AUD', name: 'Australian Dollar ($)' },
 { code: 'INR', name: 'Indian Rupee (₹)' },
 { code: 'JPY', name: 'Japanese Yen (¥)' },
 { code: 'AED', name: 'UAE Dirham (AED)' }
 ];

 const timezones = [
 { code: 'America/New_York', name: 'Eastern Standard Time (EST - UTC-5)' },
 { code: 'America/Chicago', name: 'Central Standard Time (CST - UTC-6)' },
 { code: 'America/Denver', name: 'Mountain Standard Time (MST - UTC-7)' },
 { code: 'America/Los_Angeles', name: 'Pacific Standard Time (PST - UTC-8)' },
 { code: 'Europe/London', name: 'Greenwich Mean Time (GMT - UTC+0)' },
 { code: 'Europe/Paris', name: 'Central European Time (CET - UTC+1)' },
 { code: 'Asia/Kolkata', name: 'Indian Standard Time (IST - UTC+5:30)' },
 { code: 'Asia/Tokyo', name: 'Japan Standard Time (JST - UTC+9)' }
 ];

 const countries = [
 'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'India', 'Japan', 'United Arab Emirates', 'Brazil', 'Mexico', 'Singapore'
 ];

 // Handle org name input to auto-generate slug
 const handleOrgNameChange = (val: string) => {
 setOrgName(val);
 setOrgSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
 };

 const handleSignOut = () => {
 if (typeof window === 'undefined') return;
 localStorage.removeItem('token');
 localStorage.removeItem('user');
 localStorage.removeItem('organizationId');
 localStorage.removeItem('organizationName');
 router.push('/auth?mode=login');
 };

 // Drag & drop file upload
 const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 if (file.size > 2 * 1024 * 1024) {
 showToast('Logo file size must be less than 2MB', 'error');
 return;
 }
 const reader = new FileReader();
 reader.onloadend = () => {
 setLogoUrl(reader.result as string);
 showToast('Logo uploaded successfully', 'success');
 };
 reader.readAsDataURL(file);
 }
 };

 const handleDragOver = (e: React.DragEvent) => {
 e.preventDefault();
 };

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 const file = e.dataTransfer.files?.[0];
 if (file) {
 if (file.size > 2 * 1024 * 1024) {
 showToast('Logo file size must be less than 2MB', 'error');
 return;
 }
 const reader = new FileReader();
 reader.onloadend = () => {
 setLogoUrl(reader.result as string);
 showToast('Logo uploaded successfully', 'success');
 };
 reader.readAsDataURL(file);
 }
 };

 // Validations
 const validateSubStep = (): boolean => {
 setErrorMsg('');
 if (orgSubStep === 'info') {
 if (!orgName.trim()) {
 setErrorMsg('Organization name is required.');
 return false;
 }
 if (!orgSlug.trim()) {
 setErrorMsg('Organization slug URL is required.');
 return false;
 }
 if (!businessType) {
 setErrorMsg('Please select a business type.');
 return false;
 }
 } else if (orgSubStep === 'contact') {
 if (!phone.trim()) {
 setErrorMsg('Contact phone number is required.');
 return false;
 }
 if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
 setErrorMsg('Please enter a valid email address.');
 return false;
 }
 } else if (orgSubStep === 'address') {
 if (!addressLine1.trim()) {
 setErrorMsg('Address Line 1 is required.');
 return false;
 }
 if (!city.trim()) {
 setErrorMsg('City is required.');
 return false;
 }
 if (!country.trim()) {
 setErrorMsg('Country is required.');
 return false;
 }
 if (!postalCode.trim()) {
 setErrorMsg('Postal / Zip code is required.');
 return false;
 }
 } else if (orgSubStep === 'settings') {
 if (!currency) {
 setErrorMsg('Default currency is required.');
 return false;
 }
 if (!timezone) {
 setErrorMsg('Default timezone is required.');
 return false;
 }
 }
 return true;
 };

 const handleNextSubStep = () => {
 if (validateSubStep()) {
 if (orgSubStep === 'info') setOrgSubStep('contact');
 else if (orgSubStep === 'contact') setOrgSubStep('address');
 else if (orgSubStep === 'address') setOrgSubStep('settings');
 else if (orgSubStep === 'settings') setOrgSubStep('review');
 }
 };

 const handlePrevSubStep = () => {
 setErrorMsg('');
 if (orgSubStep === 'contact') setOrgSubStep('info');
 else if (orgSubStep === 'address') setOrgSubStep('contact');
 else if (orgSubStep === 'settings') setOrgSubStep('address');
 else if (orgSubStep === 'review') setOrgSubStep('settings');
 };

 // Submit Organization creation payload
 const handleOrgSubmit = async () => {
 setLoading(true);
 setErrorMsg('');

 try {
 const org = await orgApi.create({
 name: orgName,
 slug: orgSlug,
 logoUrl: logoUrl || undefined,
 businessType,
 phone,
 email,
 website: website || undefined,
 addressLine1,
 addressLine2: addressLine2 || undefined,
 city,
 state: stateProv || undefined,
 country,
 postalCode,
 currency,
 timezone,
 dateFormat,
 language,
 });

 setCreatedOrgId(org.id);
 showToast('Organization registered successfully!', 'success');
 
 // Auto switch organization inside switcher context (simulate setting active tenant)
 localStorage.setItem('organizationId', org.id);
 localStorage.setItem('organizationName', org.name);

 setStep('success');
 } catch (err: any) {
 setErrorMsg(handleApiError(err));
 } finally {
 setLoading(false);
 }
 };

 // Leaflet map setup for Step 3: Create Gym
 useEffect(() => {
 if (step === 'gym' && typeof window !== 'undefined') {
 import('leaflet').then((L) => {
 const mapElement = document.getElementById('map-picker');
 if (!mapElement) return;

 const container = L.DomUtil.get('map-picker');
 if (container) {
 (container as any)._leaflet_id = null;
 }

 const currentLat = parseFloat(gymLat) || 37.7749;
 const currentLng = parseFloat(gymLng) || -122.4194;

 const map = L.map('map-picker').setView([currentLat, currentLng], 13);

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

 marker.on('dragend', () => {
 const position = marker.getLatLng();
 updateCoords(position.lat, position.lng);
 });

 map.on('click', (e) => {
 marker.setLatLng(e.latlng);
 updateCoords(e.latlng.lat, e.latlng.lng);
 });

 (window as any).gymflowMap = map;
 (window as any).gymflowMarker = marker;
 });
 }
 }, [step]);

 const handleUseCurrentLocation = () => {
 if (typeof window !== 'undefined' && navigator.geolocation) {
 navigator.geolocation.getCurrentPosition(
 (position) => {
 const { latitude, longitude } = position.coords;
 setGymLat(latitude.toFixed(6));
 setGymLng(longitude.toFixed(6));
 setGymAddress(`Current Location (Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);

 const map = (window as any).gymflowMap;
 const marker = (window as any).gymflowMarker;
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

 const handleAutopopulateAddress = () => {
 if (!gymLat || !gymLng) {
 showToast('Please enter Latitude and Longitude coordinates first!', 'error');
 return;
 }
 setGeocoding(true);
 setTimeout(() => {
 setGeocoding(false);
 setGymAddress(`${addressLine1}, ${city}, ${postalCode}`);
 showToast('Base address populated from organization info.', 'info');
 }, 800);
 };

 const handleProfileSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!profileFullName || !profileEmail) return;
 setLoading(true);
 setErrorMsg('');

 try {
 const data = await authApi.updateProfile({
 fullName: profileFullName,
 email: profileEmail,
 });

 // Update stored user details in localStorage
 if (data && data.user) {
 localStorage.setItem('user', JSON.stringify(data.user));
 } else {
 // Fallback: manually update the cached JSON fields
 const userStr = localStorage.getItem('user');
 const user = userStr ? JSON.parse(userStr) : {};
 user.name = profileFullName;
 user.email = profileEmail;
 localStorage.setItem('user', JSON.stringify(user));
 }

 showToast('Profile details updated successfully!', 'success');

 if (workspaces && workspaces.length > 0) {
 router.push('/organizations');
 } else {
 setStep('org');
 setOrgSubStep('info');
 }
 } catch (err: any) {
 setErrorMsg(handleApiError(err));
 } finally {
 setLoading(false);
 }
 };

 const handleGymSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!gymName || !createdOrgId) return;
 setLoading(true);
 setErrorMsg('');

 try {
 const compiledAddress = gymAddress + (gymAddressDetails ? `, ${gymAddressDetails}` : '');
 await gymApi.create({
 organizationId: createdOrgId,
 name: gymName,
 address: compiledAddress,
 latitude: parseFloat(gymLat) || null,
 longitude: parseFloat(gymLng) || null,
 contactPhone: gymPhone || undefined,
 });

 showToast('Gym created successfully!', 'success');
 router.push(`/workspace/dashboard?orgId=${createdOrgId}`);
 } catch (err: any) {
 setErrorMsg(handleApiError(err));
 } finally {
 setLoading(false);
 }
 };

 if (initLoading) {
 return (
 <div className="min-h-screen bg-background text-neutral-900 selection:bg-primary selection:text-primary font-sans flex items-center justify-center relative overflow-hidden py-10 px-6">
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden z-0">
 </div>
 <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col items-center justify-center py-20">
 <RefreshCw className="animate-spin text-primary" size={32} />
 <p className="text-xs text-neutral-600 mt-4 font-semibold">Configuring environment...</p>
 </div>
 </div>
 );
 }

 // Find business type details
 const selectedTypeObj = businessTypes.find(t => t.id === businessType);

 return (
 <div className="min-h-screen bg-background text-neutral-900 selection:bg-primary selection:text-primary font-sans flex items-center justify-center relative overflow-hidden py-12 px-4 sm:px-6">

 {/* Glow overlays */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden z-0">
 </div>

 <div className="w-full max-w-xl bg-white border border-neutral-200/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
 
 {/* Floating Sign Out */}
 <button
 onClick={handleSignOut}
 className="absolute top-6 right-6 sm:top-8 sm:right-8 p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 hover:border-red-200 hover:bg-neutral-50 text-neutral-600 hover:text-danger transition-all flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase cursor-pointer"
 title="Sign Out"
 >
 <LogOut size={12} />
 <span>Sign Out</span>
 </button>

 {/* Step Indicator Header */}
 <div className="flex flex-col items-center text-center gap-1.5 mb-6">
 <div className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary-light px-3 py-1 rounded-full border border-primary/20 select-none">
 {step === 'profile' ? 'Step 1 of 3: Setup Profile' : step === 'org' ? 'Step 2 of 3: Create Organization' : step === 'success' ? 'Created Successfully' : 'Step 3 of 3: Configure Gym'}
 </div>
 <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 mt-1">
 {step === 'profile' ? 'Tell Us About Yourself' : step === 'org' ? 'Create Your Organization' : step === 'success' ? 'Setup Complete!' : 'Configure First Gym'}
 </h2>
 <p className="text-xs text-neutral-600 max-w-sm leading-relaxed">
 {step === 'profile' ? 'Please complete your owner profile with your name and email address.' : step === 'org' ?"Let's set up your fitness business profiles, default currencies, and branding." : step === 'success' ? 'Your brand profile is active. Next, establish your first gym branch.' : 'Locate your gym branch to launch your dashboard.'}
 </p>
 </div>

 {/* Wizard Progression Bar */}
 {step === 'org' && (
 <div className="flex justify-between items-center mb-8 gap-1.5 select-none">
 {['info', 'contact', 'address', 'settings', 'review'].map((s, idx) => {
 const stages = ['info', 'contact', 'address', 'settings', 'review'];
 const currentIdx = stages.indexOf(orgSubStep);
 const isPassed = idx < currentIdx;
 const isActive = idx === currentIdx;
 return (
 <div key={s} className="flex-1 flex flex-col items-center gap-1">
 <div className={`h-1 w-full rounded-full transition-all duration-300 ${
 isActive ? 'bg-primary' : isPassed ? 'bg-primary-light' : 'bg-neutral-100'
 }`} />
 <span className={`text-[8px] font-extrabold uppercase tracking-wide transition-colors ${
 isActive ? 'text-primary' : 'text-neutral-500'
 }`}>{s}</span>
 </div>
 );
 })}
 </div>
 )}

 {errorMsg && (
 <div className="mb-6 p-3 rounded-xl bg-danger-light border border-red-200 text-danger text-xs text-center font-semibold animate-fade-in">
 {errorMsg}
 </div>
 )}

 {/* ========================================================================= */}
 {/* STEP 0: OWNER PROFILE SUB-WIZARD */}
 {/* ========================================================================= */}
 {step === 'profile' && (
 <form onSubmit={handleProfileSubmit} className="space-y-5 animate-fade-in">
 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Full Name</label>
 <input
 required
 type="text"
 value={profileFullName}
 onChange={(e) => setProfileFullName(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 placeholder="e.g. John Doe"
 />
 </div>

 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Email Address</label>
 <input
 required
 type="email"
 value={profileEmail}
 onChange={(e) => setProfileEmail(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 placeholder="e.g. john@example.com"
 />
 </div>

 <button
 type="submit"
 disabled={loading}
 className="w-full mt-6 bg-primary hover:bg-primary-hover text-white rounded-xl py-3.5 text-xs font-bold transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-1.5"
 >
 {loading ? (
 <>
 <RefreshCw className="animate-spin" size={14} />
 <span>Updating profile...</span>
 </>
 ) : (
 <span>Next: Setup Organization</span>
 )}
 </button>
 </form>
 )}

 {/* ========================================================================= */}
 {/* STEP 1: ORGANIZATION SUB-WIZARD */}
 {/* ========================================================================= */}
 {step === 'org' && (
 <div className="space-y-6">
 
 {/* SUB-STEP 1.1: GENERAL INFO & BUSINESS TYPE */}
 {orgSubStep === 'info' && (
 <div className="space-y-5 animate-fade-in">
 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Organization Name</label>
 <input
 required
 type="text"
 value={orgName}
 onChange={(e) => handleOrgNameChange(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 placeholder="e.g. FitLife Fitness"
 />
 </div>

 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Workspace URL Slug</label>
 <div className="relative flex items-center bg-neutral-50 border border-neutral-200/80 focus-within:border-primary/20 rounded-xl pr-4 transition-all">
 <span className="pl-3.5 pr-1 text-xs text-neutral-400 font-semibold select-none">gymflow.app/</span>
 <input
 required
 type="text"
 value={orgSlug}
 onChange={(e) => setOrgSlug(e.target.value)}
 className="w-full bg-transparent border-none py-3.5 text-xs text-neutral-900 outline-none"
 placeholder="fitlife-fitness"
 />
 </div>
 </div>

 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Business Type (Select One)</label>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
 {businessTypes.map((t) => {
 const Icon = t.icon;
 const isSelected = businessType === t.id;
 return (
 <div
 key={t.id}
 onClick={() => setBusinessType(t.id)}
 className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex gap-3 text-left ${
 isSelected 
 ? 'bg-primary-light border-primary/20 shadow-md ' 
 : 'bg-neutral-50/60 border-neutral-100 hover:border-neutral-200'
 }`}
 >
 <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
 isSelected ? 'bg-primary text-white border-primary/20' : 'bg-neutral-50 text-neutral-600 border-neutral-200'
 }`}>
 <Icon size={16} />
 </div>
 <div>
 <h4 className="text-xs font-bold text-neutral-800">{t.title}</h4>
 <p className="text-[10px] text-neutral-500 mt-0.5 leading-normal">{t.description}</p>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 )}

 {/* SUB-STEP 1.2: LOGO & CONTACT INFO */}
 {orgSubStep === 'contact' && (
 <div className="space-y-5 animate-fade-in">
 {/* Logo Upload Experience */}
 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Organization Logo</label>
 
 <div 
 onDragOver={handleDragOver}
 onDrop={handleDrop}
 className="border border-dashed border-neutral-200 hover:border-primary/20 rounded-2xl p-6 bg-neutral-50/40 transition-colors flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[140px]"
 >
 {logoUrl ? (
 <div className="flex flex-col items-center gap-3">
 <img 
 src={logoUrl} 
 alt="Logo Preview" 
 className="w-16 h-16 rounded-xl object-cover border border-neutral-200 shadow-md"
 />
 <div className="flex gap-2">
 <label className="px-3 py-1 bg-neutral-50 hover:bg-neutral-50 border border-neutral-200 text-[9px] font-bold text-neutral-700 rounded-lg cursor-pointer transition-colors">
 Replace Logo
 <input 
 type="file" 
 accept="image/*" 
 className="hidden" 
 onChange={handleLogoFileChange}
 />
 </label>
 <button 
 type="button"
 onClick={() => setLogoUrl('')}
 className="px-3 py-1 bg-danger-light hover:bg-danger-light border border-red-200 text-[9px] font-bold text-danger rounded-lg cursor-pointer transition-colors"
 >
 Remove
 </button>
 </div>
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center">
 <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-500 border border-neutral-200 mb-2.5">
 <UploadCloud size={18} />
 </div>
 <p className="text-xs text-neutral-700 font-bold">Drag and drop your logo file here</p>
 <p className="text-[10px] text-neutral-500 mt-1">Supports PNG, JPG, or SVG up to 2MB</p>
 
 <label className="mt-3 px-3.5 py-1.5 bg-primary-light border border-primary/20 hover:bg-primary-light text-[10px] font-bold text-primary rounded-xl cursor-pointer transition-all">
 Browse File
 <input 
 type="file" 
 accept="image/*" 
 className="hidden" 
 onChange={handleLogoFileChange}
 />
 </label>
 </div>
 )}
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Phone Number</label>
 <div className="relative flex items-center bg-neutral-50 border border-neutral-200/80 focus-within:border-primary/20 rounded-xl px-3.5">
 <Phone size={13} className="text-neutral-400 mr-2.5 shrink-0" />
 <input
 required
 type="tel"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 className="w-full bg-transparent border-none py-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none"
 placeholder="+1 (415) 555-0100"
 />
 </div>
 </div>

 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Email Address</label>
 <div className="relative flex items-center bg-neutral-50 border border-neutral-200/80 focus-within:border-primary/20 rounded-xl px-3.5">
 <Mail size={13} className="text-neutral-400 mr-2.5 shrink-0" />
 <input
 required
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full bg-transparent border-none py-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none"
 placeholder="contact@brand.com"
 />
 </div>
 </div>
 </div>

 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Website (Optional)</label>
 <div className="relative flex items-center bg-neutral-50 border border-neutral-200/80 focus-within:border-primary/20 rounded-xl px-3.5">
 <Globe size={13} className="text-neutral-400 mr-2.5 shrink-0" />
 <input
 type="url"
 value={website}
 onChange={(e) => setWebsite(e.target.value)}
 className="w-full bg-transparent border-none py-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none"
 placeholder="https://www.yourfitness.com"
 />
 </div>
 </div>
 </div>
 )}

 {/* SUB-STEP 1.3: BUSINESS ADDRESS */}
 {orgSubStep === 'address' && (
 <div className="space-y-4 animate-fade-in">
 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Address Line 1</label>
 <input
 required
 type="text"
 value={addressLine1}
 onChange={(e) => setAddressLine1(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 placeholder="100 Pine Street, Suite 400"
 />
 </div>

 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Address Line 2 (Optional)</label>
 <input
 type="text"
 value={addressLine2}
 onChange={(e) => setAddressLine2(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 placeholder="Floor 4, Building A"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">City</label>
 <input
 required
 type="text"
 value={city}
 onChange={(e) => setCity(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 placeholder="San Francisco"
 />
 </div>

 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">State / Province</label>
 <input
 type="text"
 value={stateProv}
 onChange={(e) => setStateProv(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 placeholder="California"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 {/* Searchable Country Dropdown */}
 <div className="relative">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Country</label>
 <div 
 onClick={() => setShowCountryDropdown(!showCountryDropdown)}
 className="w-full bg-neutral-50 border border-neutral-200/80 hover:border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-900 flex items-center justify-between cursor-pointer"
 >
 <span>{country}</span>
 <ChevronDown size={14} className="text-neutral-500" />
 </div>

 {showCountryDropdown && (
 <div className="absolute left-0 right-0 bottom-full mb-1 z-[60] bg-neutral-50 border border-neutral-200 rounded-2xl shadow-2xl p-2.5 space-y-2">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={12} />
 <input
 type="text"
 value={countrySearch}
 onChange={(e) => setCountrySearch(e.target.value)}
 placeholder="Search countries..."
 onClick={(e) => e.stopPropagation()}
 className="w-full bg-neutral-50 border border-neutral-200 focus:border-primary/20 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div className="max-h-36 overflow-y-auto pr-1 space-y-0.5 scrollbar-thin">
 {countries
 .filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))
 .map((c) => (
 <div
 key={c}
 onClick={() => {
 setCountry(c);
 setShowCountryDropdown(false);
 setCountrySearch('');
 }}
 className={`px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-neutral-50 flex justify-between items-center ${
 country === c ? 'text-primary font-bold bg-neutral-50/40' : 'text-neutral-700'
 }`}
 >
 <span>{c}</span>
 {country === c && <Check size={12} />}
 </div>
 ))}
 </div>
 </div>
 )}
 </div>

 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Postal / Zip Code</label>
 <input
 required
 type="text"
 value={postalCode}
 onChange={(e) => setPostalCode(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 placeholder="94111"
 />
 </div>
 </div>
 </div>
 )}

 {/* SUB-STEP 1.4: LOCALIZATION SETTINGS */}
 {orgSubStep === 'settings' && (
 <div className="space-y-5 animate-fade-in">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 
 {/* Searchable Currency Dropdown */}
 <div className="relative">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Default Currency</label>
 <div 
 onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
 className="w-full bg-neutral-50 border border-neutral-200/80 hover:border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-900 flex items-center justify-between cursor-pointer"
 >
 <span className="flex items-center gap-1.5">
 <DollarSign size={13} className="text-primary" />
 <span>{currencies.find(c => c.code === currency)?.name || currency}</span>
 </span>
 <ChevronDown size={14} className="text-neutral-500" />
 </div>

 {showCurrencyDropdown && (
 <div className="absolute left-0 right-0 bottom-full mb-1 z-[60] bg-neutral-50 border border-neutral-200 rounded-2xl shadow-2xl p-2.5 space-y-2">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={12} />
 <input
 type="text"
 value={currencySearch}
 onChange={(e) => setCurrencySearch(e.target.value)}
 placeholder="Search currency..."
 onClick={(e) => e.stopPropagation()}
 className="w-full bg-neutral-50 border border-neutral-200 focus:border-primary/20 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div className="max-h-40 overflow-y-auto pr-1 space-y-0.5 scrollbar-thin">
 {currencies
 .filter(c => c.name.toLowerCase().includes(currencySearch.toLowerCase()) || c.code.toLowerCase().includes(currencySearch.toLowerCase()))
 .map((c) => (
 <div
 key={c.code}
 onClick={() => {
 setCurrency(c.code);
 setShowCurrencyDropdown(false);
 setCurrencySearch('');
 }}
 className={`px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-neutral-50 flex justify-between items-center ${
 currency === c.code ? 'text-primary font-bold bg-neutral-50/40' : 'text-neutral-700'
 }`}
 >
 <span>{c.name} ({c.code})</span>
 {currency === c.code && <Check size={12} />}
 </div>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* Searchable Timezone Dropdown */}
 <div className="relative">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Default Timezone</label>
 <div 
 onClick={() => setShowTimezoneDropdown(!showTimezoneDropdown)}
 className="w-full bg-neutral-50 border border-neutral-200/80 hover:border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-900 flex items-center justify-between cursor-pointer"
 >
 <span className="flex items-center gap-1.5">
 <Clock size={13} className="text-primary" />
 <span className="truncate max-w-[140px]">{timezones.find(t => t.code === timezone)?.name || timezone}</span>
 </span>
 <ChevronDown size={14} className="text-neutral-500" />
 </div>

 {showTimezoneDropdown && (
 <div className="absolute left-0 right-0 bottom-full mb-1 z-[60] bg-neutral-50 border border-neutral-200 rounded-2xl shadow-2xl p-2.5 space-y-2">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={12} />
 <input
 type="text"
 value={timezoneSearch}
 onChange={(e) => setTimezoneSearch(e.target.value)}
 placeholder="Search timezone..."
 onClick={(e) => e.stopPropagation()}
 className="w-full bg-neutral-50 border border-neutral-200 focus:border-primary/20 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div className="max-h-40 overflow-y-auto pr-1 space-y-0.5 scrollbar-thin">
 {timezones
 .filter(t => t.name.toLowerCase().includes(timezoneSearch.toLowerCase()) || t.code.toLowerCase().includes(timezoneSearch.toLowerCase()))
 .map((t) => (
 <div
 key={t.code}
 onClick={() => {
 setTimezone(t.code);
 setShowTimezoneDropdown(false);
 setTimezoneSearch('');
 }}
 className={`px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-neutral-50 flex justify-between items-center ${
 timezone === t.code ? 'text-primary font-bold bg-neutral-50/40' : 'text-neutral-700'
 }`}
 >
 <span className="truncate max-w-[200px]">{t.name}</span>
 {timezone === t.code && <Check size={12} />}
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Date Format</label>
 <select
 value={dateFormat}
 onChange={(e) => setDateFormat(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 06/15/2026)</option>
 <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 15/06/2026)</option>
 <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-06-15)</option>
 </select>
 </div>

 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">System Language</label>
 <select
 value={language}
 onChange={(e) => setLanguage(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="en">English (United States)</option>
 <option value="es">Español (Spanish)</option>
 <option value="fr">Français (French)</option>
 <option value="de">Deutsch (German)</option>
 <option value="ar">العربية (Arabic)</option>
 </select>
 </div>
 </div>
 </div>
 )}

 {/* SUB-STEP 1.5: REVIEW & SUMMARY */}
 {orgSubStep === 'review' && (
 <div className="space-y-4 animate-fade-in text-left">
 <div className="bg-neutral-50/40 border border-neutral-200 p-4.5 rounded-2xl space-y-3.5">
 <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
 {logoUrl ? (
 <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-neutral-200" />
 ) : (
 <div className="w-12 h-12 rounded-xl bg-primary-light border border-primary/20 flex items-center justify-center text-primary font-extrabold text-lg select-none">
 {orgName.substring(0, 2).toUpperCase()}
 </div>
 )}
 <div>
 <h4 className="text-sm font-black text-neutral-900">{orgName}</h4>
 <p className="text-[10px] text-neutral-500 font-medium">Workspace Slug: <b className="text-primary">gymflow.app/{orgSlug}</b></p>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
 <div>
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">Business Type</span>
 <span className="font-semibold text-neutral-700 mt-0.5 block">{selectedTypeObj?.title || 'Not Selected'}</span>
 </div>

 <div>
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">Contact Phone</span>
 <span className="font-semibold text-neutral-700 mt-0.5 block">{phone}</span>
 </div>

 <div>
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">Email Address</span>
 <span className="font-semibold text-neutral-700 mt-0.5 block truncate max-w-[160px]">{email}</span>
 </div>

 <div>
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">Website URL</span>
 <span className="font-semibold text-neutral-700 mt-0.5 block truncate max-w-[160px]">{website || 'None'}</span>
 </div>
 </div>

 <div className="border-t border-neutral-100 pt-3">
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">Physical Address</span>
 <p className="text-xs text-neutral-700 mt-1 leading-relaxed">
 {addressLine1}{addressLine2 ? `, ${addressLine2}` : ''}<br />
 {city}, {stateProv && `${stateProv}, `}{country} ({postalCode})
 </p>
 </div>

 <div className="border-t border-neutral-100 pt-3 grid grid-cols-2 gap-4 text-xs">
 <div>
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">Currency</span>
 <span className="font-bold text-neutral-700 mt-0.5 block">{currency}</span>
 </div>

 <div>
 <span className="block text-[8px] font-bold text-neutral-500 uppercase">Date Format</span>
 <span className="font-semibold text-neutral-700 mt-0.5 block">{dateFormat}</span>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ACTION FOOTER BUTTONS */}
 <div className="flex gap-3 pt-3">
 {orgSubStep !== 'info' && (
 <button
 type="button"
 onClick={handlePrevSubStep}
 className="px-4.5 py-4 bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
 >
 <ArrowLeft size={13} />
 <span>Back</span>
 </button>
 )}
 
 {orgSubStep !== 'review' ? (
 <button
 type="button"
 onClick={handleNextSubStep}
 className="flex-1 py-4 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
 >
 <span>Continue</span>
 <ArrowRight size={14} />
 </button>
 ) : (
 <button
 type="button"
 onClick={handleOrgSubmit}
 disabled={loading}
 className="flex-1 py-4 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
 >
 {loading ? (
 <RefreshCw className="animate-spin" size={14} />
 ) : (
 <>
 <CheckCircle size={14} />
 <span>Create Organization</span>
 </>
 )}
 </button>
 )}
 </div>

 {/* Save & Continue Later option */}
 <div className="text-center pt-2">
 <button
 type="button"
 onClick={() => {
 showToast('Configuration draft saved.', 'info');
 router.push('/organizations');
 }}
 className="text-[10px] text-neutral-500 hover:text-neutral-600 hover:underline cursor-pointer"
 >
 Save & Continue Later
 </button>
 </div>

 </div>
 )}

 {/* ========================================================================= */}
 {/* SUCCESS STATE: NEXT STEP PROMPT */}
 {/* ========================================================================= */}
 {step === 'success' && (
 <div className="animate-fade-in text-center flex flex-col items-center gap-6">
 <div className="w-16 h-16 rounded-full bg-success-light border-2 border-green-200 flex items-center justify-center text-success shadow-lg animate-pulse">
 <CheckCircle size={36} />
 </div>

 <div>
 <h3 className="text-xl font-black text-neutral-900">Organization Created Successfully</h3>
 <p className="text-xs text-neutral-600 mt-2 leading-relaxed max-w-xs mx-auto">
 Your brand profile has been registered on the network. Now set up your physical branch.
 </p>
 </div>

 <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 w-full text-left flex items-center gap-3">
 {logoUrl ? (
 <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-neutral-200" />
 ) : (
 <div className="w-12 h-12 rounded-xl bg-primary-light border border-primary/20 flex items-center justify-center text-primary font-extrabold text-lg select-none">
 {orgName.substring(0, 2).toUpperCase()}
 </div>
 )}
 <div>
 <h4 className="text-xs font-black text-neutral-900">{orgName}</h4>
 <p className="text-[10px] text-neutral-500 font-medium">Type: {selectedTypeObj?.title || 'Fitness brand'}</p>
 </div>
 </div>

 <button
 onClick={() => setStep('gym')}
 className="w-full py-4 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
 >
 <span>Continue: Create First Gym</span>
 <ArrowRight size={14} />
 </button>
 </div>
 )}

 {/* ========================================================================= */}
 {/* STEP 2: CREATE FIRST GYM */}
 {/* ========================================================================= */}
 {step === 'gym' && (
 <div className="animate-fade-in space-y-4">
 <form onSubmit={handleGymSubmit} className="space-y-4">
 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Gym Branch Name</label>
 <input
 required
 type="text"
 value={gymName}
 onChange={(e) => setGymName(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 placeholder="e.g. Downtown Branch"
 />
 </div>

 {/* Mappicker Area */}
 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Map Selection (Drag Pin or Click Map)</label>
 <div id="map-picker" className="w-full h-36 rounded-xl border border-neutral-200 bg-neutral-50 mb-2 overflow-hidden z-10 relative" />
 <div className="flex gap-2">
 <button
 type="button"
 onClick={handleUseCurrentLocation}
 className="flex-1 py-2.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 rounded-lg text-[10px] font-bold text-neutral-700 hover:text-neutral-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
 >
 <Navigation size={12} className="text-primary animate-pulse" />
 <span>Use Current Location</span>
 </button>
 <button
 type="button"
 onClick={handleAutopopulateAddress}
 className="flex-1 py-2.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 rounded-lg text-[10px] font-bold text-neutral-700 hover:text-neutral-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
 >
 <Globe size={12} className="text-primary" />
 <span>Fetch Address</span>
 </button>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Latitude</label>
 <input
 required
 type="text"
 value={gymLat}
 onChange={(e) => setGymLat(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Longitude</label>
 <input
 required
 type="text"
 value={gymLng}
 onChange={(e) => setGymLng(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 </div>

 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Base Address</label>
 <input
 required
 type="text"
 value={gymAddress}
 onChange={(e) => setGymAddress(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 placeholder="Address or click Fetch Address above"
 />
 </div>

 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Address Details (Building No, Floor, Suite)</label>
 <input
 type="text"
 value={gymAddressDetails}
 onChange={(e) => setGymAddressDetails(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 placeholder="e.g. Suite 400, 3rd Floor"
 />
 </div>

 <div>
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Contact Phone</label>
 <input
 required
 type="tel"
 value={gymPhone}
 onChange={(e) => setGymPhone(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 placeholder="+1 (415) 555-0199"
 />
 </div>

 <button
 type="submit"
 disabled={loading}
 className="w-full py-4 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
 >
 {loading ? <RefreshCw className="animate-spin" size={14} /> : <span>Launch GymFlow Dashboard</span>}
 </button>
 </form>
 </div>
 )}

 </div>

 {/* CUSTOM FLOATING TOAST NOTIFICATION */}
 {toast && (
 <div className="fixed top-5 right-5 z-100 animate-slide-in flex items-center gap-3 p-4 bg-white backdrop-blur-md border border-neutral-200 rounded-2xl shadow-2xl max-w-sm">
 <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
 toast.type === 'success' ? 'bg-success shadow-lg ' :
 toast.type === 'error' ? 'bg-danger shadow-lg ' : 'bg-primary shadow-lg '
 }`} />
 <span className="text-xs font-bold text-neutral-900">{toast.message}</span>
 </div>
 )}

 </div>
 );
}
