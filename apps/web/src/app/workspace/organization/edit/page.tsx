'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
 Sparkles,
 Undo2,
 LockKeyhole
} from 'lucide-react';
import { orgApi, rolesApi, subscriptionApi } from '../../../../lib/api';
import { handleApiError } from '../../../../lib/api/client';

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
 createdAt: string;
 description?: string;
 supportContact?: string;
 supportEmail?: string;
 primaryColor?: string;
 secondaryColor?: string;
 faviconUrl?: string;
 allowMemberSelfRegistration?: boolean;
 enableMultiBranchOperations?: boolean;
 enableAttendanceTracking?: boolean;
 enableWorkoutManagement?: boolean;
 enableDietManagement?: boolean;
 enablePersonalTraining?: boolean;
}

export default function EditOrganizationPage() {
 const router = useRouter();
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [originalOrg, setOriginalOrg] = useState<OrganizationDetails | null>(null);
 
 // Form States
 const [name, setName] = useState('');
 const [businessType, setBusinessType] = useState('Gym');
 const [description, setDescription] = useState('');
 const [website, setWebsite] = useState('');
 const [logoUrl, setLogoUrl] = useState('');
 const [phone, setPhone] = useState('');
 const [email, setEmail] = useState('');
 const [supportContact, setSupportContact] = useState('');
 const [supportEmail, setSupportEmail] = useState('');
 const [addressLine1, setAddressLine1] = useState('');
 const [addressLine2, setAddressLine2] = useState('');
 const [city, setCity] = useState('');
 const [state, setState] = useState('');
 const [country, setCountry] = useState('United States');
 const [postalCode, setPostalCode] = useState('');
 const [currency, setCurrency] = useState('USD');
 const [timezone, setTimezone] = useState('America/New_York');
 const [language, setLanguage] = useState('en');
 const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
 const [timeFormat, setTimeFormat] = useState('12h');
 const [weekStartDay, setWeekStartDay] = useState('monday');
 const [primaryColor, setPrimaryColor] = useState('#f97316'); // default orange
 const [secondaryColor, setSecondaryColor] = useState('#ec4899'); // default pink
 const [faviconUrl, setFaviconUrl] = useState('');
 const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
 
 // Preferences
 const [allowSelfReg, setAllowSelfReg] = useState(true);
 const [enableMultiBranch, setEnableMultiBranch] = useState(true);
 const [enableAttendance, setEnableAttendance] = useState(true);
 const [enableWorkouts, setEnableWorkouts] = useState(true);
 const [enableDiets, setEnableDiets] = useState(true);
 const [enablePersonalTraining, setEnablePersonalTraining] = useState(false); // Locked by plan example

 // UI Flow States
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
 const [errorMsg, setErrorMsg] = useState('');
 const [modifiedFields, setModifiedFields] = useState<{ field: string; oldVal: string; newVal: string }[]>([]);
 const [reviewPanelOpen, setReviewPanelOpen] = useState(false);
 const [successStateOpen, setSuccessStateOpen] = useState(false);
 const [discardWarningOpen, setDiscardWarningOpen] = useState(false);
 const [auditLogs, setAuditLogs] = useState<any[]>([]);
 const [successInfo, setSuccessInfo] = useState<{ user: string; time: string } | null>(null);
 const [subscription, setSubscription] = useState<any>(null);

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

 const orgs = await orgApi.list();
 const currentOrg = orgs.find((o: any) => o.id === orgId);

 if (currentOrg) {
 const orgDetails: OrganizationDetails = {
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
 createdAt: currentOrg.createdAt || new Date().toISOString(),
 description: currentOrg.description || 'Enterprise physical training centers chain.',
 supportContact: currentOrg.supportContact || '+1 (415) 555-0199',
 supportEmail: currentOrg.supportEmail || 'support@gymflow.io',
 primaryColor: currentOrg.primaryColor || '#f97316',
 secondaryColor: currentOrg.secondaryColor || '#ec4899',
 faviconUrl: currentOrg.faviconUrl || '',
 allowMemberSelfRegistration: currentOrg.allowMemberSelfRegistration ?? true,
 enableMultiBranchOperations: currentOrg.enableMultiBranchOperations ?? true,
 enableAttendanceTracking: currentOrg.enableAttendanceTracking ?? true,
 enableWorkoutManagement: currentOrg.enableWorkoutManagement ?? true,
 enableDietManagement: currentOrg.enableDietManagement ?? true,
 enablePersonalTraining: currentOrg.enablePersonalTraining ?? false,
 };

 setOriginalOrg(orgDetails);
 
 // Sync states
 setName(orgDetails.name);
 setBusinessType(orgDetails.businessType || 'Gym');
 setDescription(orgDetails.description || '');
 setWebsite(orgDetails.website || '');
 setLogoUrl(orgDetails.logoUrl || '');
 setPhone(orgDetails.phone || '');
 setEmail(orgDetails.email || '');
 setSupportContact(orgDetails.supportContact || '');
 setSupportEmail(orgDetails.supportEmail || '');
 setAddressLine1(orgDetails.addressLine1 || '');
 setAddressLine2(orgDetails.addressLine2 || '');
 setCity(orgDetails.city || '');
 setState(orgDetails.state || '');
 setCountry(orgDetails.country || 'United States');
 setPostalCode(orgDetails.postalCode || '');
 setCurrency(orgDetails.currency || 'USD');
 setTimezone(orgDetails.timezone || 'America/New_York');
 setLanguage(orgDetails.language || 'en');
 setDateFormat(orgDetails.dateFormat || 'MM/DD/YYYY');
 setPrimaryColor(orgDetails.primaryColor || '#f97316');
 setSecondaryColor(orgDetails.secondaryColor || '#ec4899');
 setFaviconUrl(orgDetails.faviconUrl || '');
 setAllowSelfReg(orgDetails.allowMemberSelfRegistration ?? true);
 setEnableMultiBranch(orgDetails.enableMultiBranchOperations ?? true);
 setEnableAttendance(orgDetails.enableAttendanceTracking ?? true);
 setEnableWorkouts(orgDetails.enableWorkoutManagement ?? true);
 setEnableDiets(orgDetails.enableDietManagement ?? true);
 setEnablePersonalTraining(orgDetails.enablePersonalTraining ?? false);
 } else {
 setErrorMsg('Organization profile could not be resolved.');
 }

 // Load active subscription
 try {
 const sub = await subscriptionApi.getActive();
 setSubscription(sub);
 } catch (_) {}

 // Load previous audit logs for history panel
 const dbLogs = await rolesApi.getAuditLogs();
 const filteredLogs = (dbLogs || []).filter(
 (log: any) =>
 log.eventType &&
 log.eventType.startsWith('ORG_')
 );
 setAuditLogs(filteredLogs);

 } catch (err: any) {
 console.error(err);
 setErrorMsg(handleApiError(err) || 'Failed to load organization settings.');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, []);

 const getFormValues = () => {
 return {
 name,
 businessType,
 description,
 website,
 logoUrl,
 phone,
 email,
 supportContact,
 supportEmail,
 addressLine1,
 addressLine2,
 city,
 state,
 country,
 postalCode,
 currency,
 timezone,
 language,
 dateFormat,
 primaryColor,
 secondaryColor,
 faviconUrl,
 allowMemberSelfRegistration: allowSelfReg,
 enableMultiBranchOperations: enableMultiBranch,
 enableAttendanceTracking: enableAttendance,
 enableWorkoutManagement: enableWorkouts,
 enableDietManagement: enableDiets,
 enablePersonalTraining,
 };
 };

 // Determine which fields changed
 const checkModifiedFields = () => {
 if (!originalOrg) return [];
 const current = getFormValues();
 const list: { field: string; oldVal: string; newVal: string }[] = [];

 const fieldLabels: Record<string, string> = {
 name: 'Organization Name',
 businessType: 'Business Type',
 description: 'Description',
 website: 'Website URL',
 logoUrl: 'Branding Logo',
 phone: 'Phone Number',
 email: 'Email Address',
 supportContact: 'Support Phone',
 supportEmail: 'Support Email',
 addressLine1: 'Address Line 1',
 addressLine2: 'Address Line 2',
 city: 'City',
 state: 'State',
 country: 'Country',
 postalCode: 'Postal Code',
 currency: 'Default Currency',
 timezone: 'Timezone',
 language: 'Language',
 dateFormat: 'Date Format',
 primaryColor: 'Primary Accent Color',
 secondaryColor: 'Secondary Accent Color',
 faviconUrl: 'Branding Favicon',
 allowMemberSelfRegistration: 'Allow Self Registration',
 enableMultiBranchOperations: 'Multi-Branch Operations',
 enableAttendanceTracking: 'Attendance Tracking',
 enableWorkoutManagement: 'Workout Library Builder',
 enableDietManagement: 'Diet Customizer Access',
 enablePersonalTraining: 'Personal Coaching Feature',
 };

 for (const key in current) {
 const origVal = (originalOrg as any)[key];
 const newVal = (current as any)[key];
 if (newVal !== origVal) {
 list.push({
 field: fieldLabels[key] || key,
 oldVal: String(origVal === undefined || origVal === '' ? 'Empty' : origVal),
 newVal: String(newVal === undefined || newVal === '' ? 'Empty' : newVal),
 });
 }
 }
 return list;
 };

 const isFormDirty = () => {
 return checkModifiedFields().length > 0;
 };

 const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 const reader = new FileReader();
 reader.onloadend = () => {
 setLogoUrl(reader.result as string);
 };
 reader.readAsDataURL(file);
 showToast('New organization logo uploaded.');
 }
 };

 const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 const reader = new FileReader();
 reader.onloadend = () => {
 setFaviconUrl(reader.result as string);
 };
 reader.readAsDataURL(file);
 showToast('New favicon uploaded.');
 }
 };

 // Click Save changes triggers review comparison first
 const handleSaveClick = (e: React.FormEvent) => {
 e.preventDefault();
 
 // Validation
 if (!name.trim()) {
 showToast('Organization name is required.', 'error');
 return;
 }
 if (!email.trim() || !email.includes('@')) {
 showToast('A valid contact email is required.', 'error');
 return;
 }
 if (!currency) {
 showToast('Base Currency is required.', 'error');
 return;
 }
 if (!timezone) {
 showToast('Primary System Timezone is required.', 'error');
 return;
 }

 const changes = checkModifiedFields();
 if (changes.length === 0) {
 showToast('No configurations were changed.', 'error');
 return;
 }

 setModifiedFields(changes);
 setReviewPanelOpen(true);
 };

 // Submit actual changes to API
 const confirmSaveSubmit = async () => {
 if (!originalOrg) return;
 setSaving(true);
 try {
 const payload = getFormValues();
 await orgApi.update(originalOrg.id, payload);

 // Apply org brand settings live to the running workspace
 if (payload.primaryColor) document.documentElement.style.setProperty('--org-primary', payload.primaryColor);
 if (payload.secondaryColor) document.documentElement.style.setProperty('--org-secondary', payload.secondaryColor);
 if (payload.currency) localStorage.setItem('orgCurrency', payload.currency);
 if (payload.timezone) localStorage.setItem('orgTimezone', payload.timezone);
 if (payload.dateFormat) localStorage.setItem('orgDateFormat', payload.dateFormat);
 if (payload.language) localStorage.setItem('orgLanguage', payload.language);
 window.dispatchEvent(new CustomEvent('orgSettingsChanged', { detail: payload }));

 setReviewPanelOpen(false);
 setSuccessInfo({
 user: 'Marcus Vance (Owner)',
 time: new Date().toLocaleString()
 });
 setSuccessStateOpen(true);
 showToast('Organization details updated successfully.', 'success');
 } catch (err: any) {
 showToast(handleApiError(err) || 'Failed to update organization details.', 'error');
 } finally {
 setSaving(false);
 }
 };

 const handleDiscardClick = () => {
 if (isFormDirty()) {
 setDiscardWarningOpen(true);
 } else {
 router.push('/workspace/organization/details');
 }
 };

 const confirmDiscard = () => {
 setDiscardWarningOpen(false);
 router.push('/workspace/organization/details');
 };

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
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="h-96 bg-white border border-neutral-200 rounded-2xl lg:col-span-2" />
 <div className="h-96 bg-white border border-neutral-200 rounded-2xl" />
 </div>
 </div>
 );
 }

 if (errorMsg || !originalOrg) {
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
 {/* Toast Alert Feed */}
 {toast && (
 <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-bold shadow-2xl animate-fade-in ${
 toast.type === 'success'
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
 <span>Edit Organization</span>
 </h2>
 <p className="text-xs text-neutral-500 mt-1">Update your organization's profile, contact information, branding, and business settings.</p>
 </div>

 <div className="flex items-center gap-2.5 w-full sm:w-auto">
 <button 
 onClick={handleDiscardClick}
 className="flex-1 sm:flex-initial py-2.5 px-4 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 hover:text-neutral-900 transition-all cursor-pointer"
 >
 Discard Changes
 </button>
 <button 
 onClick={handleSaveClick}
 className="flex-1 sm:flex-initial py-2.5 px-5 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
 >
 Save Changes
 </button>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 
 {/* LEFT & CENTER: FORM SECTIONS */}
 <div className="lg:col-span-2 space-y-6">
 
 {/* SECTION 1: PROFILE */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-5">
 <div className="border-b border-neutral-100 pb-3">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">1. Organization Profile</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Manage logo, central business name, description and industry type.</p>
 </div>

 <div className="space-y-4">
 {/* Logo Management */}
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Organization Logo</label>
 <div className="flex items-center gap-5 p-4 bg-neutral-50/40 rounded-2xl border border-neutral-100">
 {logoUrl ? (
 <img src={logoUrl} alt="Org Logo" className="w-16 h-16 rounded-2xl object-cover border border-neutral-200 shadow-md" />
 ) : (
 <div className="w-16 h-16 rounded-2xl bg-primary-light border border-primary/20 flex items-center justify-center text-primary font-black text-xl">
 {name ? name.substring(0, 2).toUpperCase() : 'GF'}
 </div>
 )}
 <div className="space-y-2">
 <div className="flex gap-2">
 <label className="px-3 py-1.5 bg-primary-light border border-primary/20 hover:bg-primary-light text-[10px] font-black text-primary rounded-lg cursor-pointer transition-all">
 Upload Logo
 <input type="file" accept="image/png, image/jpeg, image/svg+xml" className="hidden" onChange={handleLogoUpload} />
 </label>
 {logoUrl && (
 <button 
 type="button"
 onClick={() => { setLogoUrl(''); showToast('Logo removed.'); }}
 className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 hover:border-red-200 text-[10px] font-bold text-neutral-600 hover:text-danger rounded-lg transition-all cursor-pointer"
 >
 Remove
 </button>
 )}
 </div>
 <span className="block text-[8px] text-neutral-500">Supported formats: PNG, JPG, SVG. Recommended square proportions.</span>
 </div>
 </div>
 </div>

 {/* Name & Type */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Organization Name *</label>
 <input
 type="text"
 required
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="e.g. FitLife Fitness Centers"
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none transition-all placeholder-neutral-400"
 />
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Business Type</label>
 <select
 value={businessType}
 onChange={(e) => setBusinessType(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="Gym">Gym & Health Club</option>
 <option value="CrossFit">CrossFit Box</option>
 <option value="Yoga">Yoga & Pilates Studio</option>
 <option value="Personal Training">Personal Training Center</option>
 <option value="Multi-Sport">Multi-Sport Complex</option>
 </select>
 </div>
 </div>

 {/* Description */}
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Organization Description</label>
 <textarea
 rows={3}
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="Provide a brief description of your organization operations..."
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none transition-all resize-none placeholder-neutral-400"
 />
 </div>
 </div>
 </div>

 {/* SECTION 2: CONTACT INFORMATION */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-5">
 <div className="border-b border-neutral-100 pb-3">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">2. Contact Information</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Primary communication details and client support channels.</p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Phone Number</label>
 <input
 type="text"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Email Address *</label>
 <input
 type="email"
 required
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Website URL</label>
 <input
 type="url"
 value={website}
 onChange={(e) => setWebsite(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Support Phone</label>
 <input
 type="text"
 value={supportContact}
 onChange={(e) => setSupportContact(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Support Email</label>
 <input
 type="email"
 value={supportEmail}
 onChange={(e) => setSupportEmail(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 </div>
 </div>
 </div>

 {/* SECTION 3: BUSINESS ADDRESS */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-5">
 <div className="border-b border-neutral-100 pb-3">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">3. Business Address</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">The primary legal and business location address details.</p>
 </div>

 <div className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Address Line 1</label>
 <input
 type="text"
 value={addressLine1}
 onChange={(e) => setAddressLine1(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Address Line 2 (Optional)</label>
 <input
 type="text"
 value={addressLine2}
 onChange={(e) => setAddressLine2(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">City</label>
 <input
 type="text"
 value={city}
 onChange={(e) => setCity(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">State / Province</label>
 <input
 type="text"
 value={state}
 onChange={(e) => setState(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Country</label>
 <input
 type="text"
 value={country}
 onChange={(e) => setCountry(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Postal Code</label>
 <input
 type="text"
 value={postalCode}
 onChange={(e) => setPostalCode(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none"
 />
 </div>
 </div>
 </div>
 </div>

 {/* SECTION 4: BUSINESS SETTINGS */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-5">
 <div className="border-b border-neutral-100 pb-3">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">4. Business Settings</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Configure defaults for currency, dates, and localized timezone rules.</p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Default Currency *</label>
 <select
 value={currency}
 onChange={(e) => setCurrency(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="USD">USD ($)</option>
 <option value="EUR">EUR (€)</option>
 <option value="GBP">GBP (£)</option>
 <option value="CAD">CAD ($)</option>
 <option value="INR">INR (₹)</option>
 </select>
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Timezone *</label>
 <select
 value={timezone}
 onChange={(e) => setTimezone(e.target.value)}
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
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">System Language</label>
 <select
 value={language}
 onChange={(e) => setLanguage(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="en">English (US)</option>
 <option value="es">Español</option>
 <option value="fr">Français</option>
 <option value="de">Deutsch</option>
 </select>
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Date Display Format</label>
 <select
 value={dateFormat}
 onChange={(e) => setDateFormat(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="MM/DD/YYYY">MM/DD/YYYY</option>
 <option value="DD/MM/YYYY">DD/MM/YYYY</option>
 <option value="YYYY-MM-DD">YYYY-MM-DD</option>
 </select>
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Time Format</label>
 <select
 value={timeFormat}
 onChange={(e) => setTimeFormat(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="12h">12-Hour (AM/PM)</option>
 <option value="24h">24-Hour (Military)</option>
 </select>
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">First Day of Week</label>
 <select
 value={weekStartDay}
 onChange={(e) => setWeekStartDay(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3 text-xs text-neutral-900 outline-none cursor-pointer"
 >
 <option value="monday">Monday</option>
 <option value="sunday">Sunday</option>
 </select>
 </div>
 </div>
 </div>

 {/* SECTION 5: BRANDING SETTINGS */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-5">
 <div className="border-b border-neutral-100 pb-3 flex justify-between items-center">
 <div>
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">5. Branding Settings</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Customize accent themes and favicon branding styles.</p>
 </div>
 <span className="px-2 py-0.5 bg-primary-light border border-primary/20 text-[9px] font-bold text-primary rounded flex items-center gap-1">
 <Sparkles size={10} /> Live Preview
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
 
 {/* Color pickers */}
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Primary Theme Color</label>
 <div className="flex items-center gap-2">
 <input 
 type="color" 
 value={primaryColor} 
 onChange={(e) => setPrimaryColor(e.target.value)}
 className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer outline-none shrink-0" 
 />
 <input 
 type="text" 
 value={primaryColor} 
 onChange={(e) => setPrimaryColor(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 rounded-xl p-2 text-xs text-neutral-900 font-mono outline-none" 
 />
 </div>
 </div>
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Secondary Theme Color</label>
 <div className="flex items-center gap-2">
 <input 
 type="color" 
 value={secondaryColor} 
 onChange={(e) => setSecondaryColor(e.target.value)}
 className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer outline-none shrink-0" 
 />
 <input 
 type="text" 
 value={secondaryColor} 
 onChange={(e) => setSecondaryColor(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/80 rounded-xl p-2 text-xs text-neutral-900 font-mono outline-none" 
 />
 </div>
 </div>
 </div>

 {/* Favicon Upload */}
 <div>
 <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Favicon Icon (ICO/PNG)</label>
 <div className="flex items-center gap-4 p-3 bg-neutral-50/40 rounded-xl border border-neutral-100">
 {faviconUrl ? (
 <img src={faviconUrl} alt="Favicon" className="w-8 h-8 rounded-lg object-cover border border-neutral-200 shadow" />
 ) : (
 <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-[10px] text-neutral-500">
 ICO
 </div>
 )}
 <label className="px-3 py-1 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-[9px] font-bold text-neutral-700 rounded cursor-pointer transition-all">
 Select File
 <input type="file" accept="image/x-icon, image/png" className="hidden" onChange={handleFaviconUpload} />
 </label>
 </div>
 </div>
 </div>

 {/* Brand Preview panel */}
 <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl flex flex-col justify-between min-h-[150px]">
 <span className="text-[8px] font-extrabold uppercase tracking-wider text-neutral-500 select-none">Client UI Theme Preview</span>
 
 <div className="space-y-3.5 my-3">
 <div className="flex gap-2">
 <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
 <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
 <div className="h-2.5 w-24 bg-neutral-50 rounded-full" />
 </div>

 {/* Buttons simulated */}
 <div className="flex gap-2">
 <button 
 type="button" 
 className="px-4 py-2 text-[9px] font-black rounded-lg text-neutral-900 transition-all pointer-events-none"
 style={{ backgroundColor: primaryColor }}
 >
 Primary Button
 </button>
 <button 
 type="button" 
 className="px-4 py-2 text-[9px] font-black rounded-lg text-neutral-900 transition-all pointer-events-none"
 style={{ backgroundColor: secondaryColor }}
 >
 Secondary Button
 </button>
 </div>
 </div>
 
 <span className="text-[8px] text-neutral-400 block leading-tight">These colors are applied to your organization portal and client mobile workspaces.</span>
 </div>

 </div>
 </div>

 {/* SECTION 6: PREFERENCES */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-5">
 <div className="border-b border-neutral-100 pb-3">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">6. Organization Preferences</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Toggle active feature accesses and permission scopes.</p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 
 {[
 { id: 'selfReg', label: 'Allow Member Self Registration', desc: 'Permit athletes to register via the public landing link.', checked: allowSelfReg, set: setAllowSelfReg },
 { id: 'multiBranch', label: 'Enable Multi Branch Operations', desc: 'Allows global administrators to manage multiple sites.', checked: enableMultiBranch, set: setEnableMultiBranch },
 { id: 'attendance', label: 'Enable Attendance Tracking', desc: 'Monitors physical check-in events in real time.', checked: enableAttendance, set: setEnableAttendance },
 { id: 'workouts', label: 'Enable Workout Library Builder', desc: 'Provides trainers tools to compile specific workout plans.', checked: enableWorkouts, set: setEnableWorkouts },
 { id: 'diets', label: 'Enable Diet Customizer Access', desc: 'Unlocks diet templates and calorie dashboards.', checked: enableDiets, set: setEnableDiets },
 ].map((pref) => (
 <div key={pref.id} className="p-3 bg-neutral-50/40 border border-neutral-100 rounded-xl flex items-center justify-between">
 <div className="pr-4">
 <span className="block text-xs font-bold text-neutral-800">{pref.label}</span>
 <span className="block text-[9px] text-neutral-500 mt-0.5 leading-relaxed">{pref.desc}</span>
 </div>
 <button
 type="button"
 onClick={() => pref.set(!pref.checked)}
 className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
 pref.checked ? 'bg-primary' : 'bg-neutral-100'
 }`}
 >
 <span
 className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
 pref.checked ? 'translate-x-4' : 'translate-x-0'
 }`}
 />
 </button>
 </div>
 ))}

 {/* Locked Feature Example */}
 <div className="p-3 bg-neutral-50/15 border border-neutral-100/40 rounded-xl flex items-center justify-between opacity-60 relative select-none">
 <div className="pr-4">
 <span className="block text-xs font-bold text-neutral-600 flex items-center gap-1.5">
 Enable Personal Training
 <LockKeyhole size={11} className="text-neutral-500" />
 </span>
 <span className="block text-[9px] text-neutral-400 mt-0.5 leading-relaxed">Assign private coaches and manage training fees.</span>
 </div>
 <span className="px-2 py-0.5 bg-danger-light border border-red-200 text-[8px] font-bold text-danger rounded">
 Requires Pro
 </span>
 </div>

 </div>
 </div>

 </div>

 {/* RIGHT COLUMN: READ-ONLY DETAILS, TIMELINE & HELP */}
 <div className="space-y-6">
 
 {/* SECTION 7: SUBSCRIPTION INFO */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-4">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider select-none">Subscription overview</h3>

 {subscription ? (
 <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl space-y-3">
 <div>
 <span className="text-[8px] font-bold text-neutral-500 uppercase">Current Tier</span>
 <div className="flex items-center gap-1.5 mt-0.5">
 <span className="text-sm font-black text-neutral-900">{subscription.plan?.name || 'Free Plan'}</span>
 {subscription.trialEndDate && new Date(subscription.trialEndDate) > new Date() && (
 <span className="px-2 py-0.5 rounded bg-primary-light border border-primary/20 text-[8px] font-black text-primary uppercase">Trial</span>
 )}
 </div>
 </div>

 <div className="space-y-2 text-[10px]">
 <div className="flex justify-between">
 <span className="text-neutral-500">Status:</span>
 <span className={`font-bold ${subscription.status === 'Active' ? 'text-success' : 'text-warning'}`}>
 {subscription.status}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Renewal Date:</span>
 <span className="text-neutral-700 font-semibold">
 {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
 </span>
 </div>
 {(() => {
 const branchLimit = subscription.plan?.resourceLimits?.find((r: any) => r.resource?.key === 'gym_locations' || r.resourceKey === 'gym_locations');
 const memberLimit = subscription.plan?.resourceLimits?.find((r: any) => r.resource?.key === 'active_members' || r.resourceKey === 'active_members');
 return (
 <>
 <div className="flex justify-between">
 <span className="text-neutral-500">Branch limit:</span>
 <span className="text-neutral-700 font-semibold">
 {branchLimit ? (branchLimit.limitType === 'UNLIMITED' ? 'Unlimited' : `Up to ${branchLimit.limitValue} locations`) : 'Unlimited'}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Member limit:</span>
 <span className="text-neutral-700 font-semibold">
 {memberLimit ? (memberLimit.limitType === 'UNLIMITED' ? 'Unlimited' : `${memberLimit.limitValue?.toLocaleString()} active`) : 'Unlimited'}
 </span>
 </div>
 </>
 );
 })()}
 {subscription.plan?.price !== undefined && (
 <div className="flex justify-between pt-1 border-t border-neutral-200">
 <span className="text-neutral-500">Plan Rate:</span>
 <span className="text-neutral-700 font-semibold">
 {subscription.plan.price === 0 ? 'Free' : `${subscription.plan.currency === 'INR' ? '₹' : '$'}${subscription.plan.price}/${subscription.plan.billingCycle === 'MONTHLY' ? 'mo' : 'yr'}`}
 </span>
 </div>
 )}
 </div>
 </div>
 ) : (
 <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-center text-[10px] text-neutral-400">
 No active subscription found.
 </div>
 )}

 <button
 type="button"
 onClick={() => showToast('Redirecting to subscription management...', 'success')}
 className="w-full py-2.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-xs font-bold text-neutral-700 hover:text-neutral-900 rounded-xl transition-all cursor-pointer text-center block"
 >
 Manage Subscription
 </button>
 </div>

 {/* STATUS SELECT */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-4">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider select-none">Organization Status</h3>
 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => setStatus('Active')}
 className={`flex-1 py-2 px-3 text-xs font-bold border rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
 status === 'Active'
 ? 'bg-success-light border-green-200 text-success font-black'
 : 'bg-neutral-50 border-neutral-100 text-neutral-500 hover:text-neutral-700'
 }`}
 >
 <span className={`w-1.5 h-1.5 rounded-full ${status === 'Active' ? 'bg-success' : 'bg-neutral-100'}`} />
 Active
 </button>
 <button
 type="button"
 onClick={() => setStatus('Inactive')}
 className={`flex-1 py-2 px-3 text-xs font-bold border rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
 status === 'Inactive'
 ? 'bg-danger-light border-red-200 text-danger font-black'
 : 'bg-neutral-50 border-neutral-100 text-neutral-500 hover:text-neutral-700'
 }`}
 >
 <span className={`w-1.5 h-1.5 rounded-full ${status === 'Inactive' ? 'bg-danger' : 'bg-neutral-100'}`} />
 Inactive
 </button>
 </div>
 {status === 'Inactive' && (
 <div className="p-3 bg-danger-light border border-red-200 rounded-xl text-[9px] text-danger leading-relaxed">
 <b>Warning:</b> Marking the organization Inactive will restrict access to all connected gym branches and portal dashboards.
 </div>
 )}
 </div>

 {/* AUDIT LOG TIMELINE SUMMARY */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 shadow-xl space-y-4">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider select-none">Previous Update History</h3>
 
 {auditLogs.length === 0 ? (
 <div className="p-4 bg-neutral-50/40 border border-neutral-100 rounded-2xl text-center select-none">
 <Clock className="text-neutral-400 mx-auto mb-2" size={20} />
 <span className="text-[10px] text-neutral-500 block">No profile update logs recorded.</span>
 </div>
 ) : (
 <div className="relative border-l border-neutral-100 pl-3.5 space-y-4 text-xs select-none">
 {auditLogs.slice(0, 5).map((log) => (
 <div key={log.id} className="relative">
 <span className="absolute left-[-21px] top-1.5 w-2 h-2 rounded-full bg-primary border border-neutral-200" />
 <div className="flex justify-between gap-2">
 <span className="font-bold text-neutral-700">{log.action}</span>
 <span className="text-[8px] font-mono text-neutral-400 shrink-0">{log.timestamp}</span>
 </div>
 <p className="text-[9px] text-neutral-500 mt-0.5">{log.details}</p>
 <span className="block text-[8px] text-neutral-400 mt-0.5">By: {log.user}</span>
 </div>
 ))}
 </div>
 )}
 </div>

 </div>

 </div>

 {/* ========================================================================= */}
 {/* DIALOG 1: CHANGE REVIEW PANEL OVERLAY */}
 {/* ========================================================================= */}
 {reviewPanelOpen && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background backdrop-blur-md animate-fade-in">
 <div className="fixed inset-0" onClick={() => setReviewPanelOpen(false)} />
 
 <div className="w-full max-w-lg bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-2xl relative z-10 animate-scale-up max-h-[85vh] flex flex-col justify-between">
 <div>
 <div className="flex justify-between items-start border-b border-neutral-100 pb-3 mb-4">
 <div>
 <h3 className="text-base font-extrabold text-neutral-900">Review Changes</h3>
 <p className="text-[10px] text-neutral-600 mt-1">Please review the list of modified configurations before saving.</p>
 </div>
 <button 
 onClick={() => setReviewPanelOpen(false)} 
 className="text-neutral-500 hover:text-neutral-800 cursor-pointer"
 >
 <X size={18} />
 </button>
 </div>

 {/* Table of modifications */}
 <div className="overflow-y-auto scrollbar-thin max-h-[40vh] border border-neutral-100 rounded-2xl bg-neutral-50/40">
 <table className="w-full text-[11px] text-left border-collapse">
 <thead>
 <tr className="border-b border-neutral-100 text-neutral-500 font-bold uppercase text-[8px] select-none">
 <th className="py-2.5 px-4">Configuration Field</th>
 <th className="py-2.5 px-4">Current Value</th>
 <th className="py-2.5 px-4">New Value</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100/60 text-neutral-700">
 {modifiedFields.map((change, idx) => (
 <tr key={idx} className="hover:bg-neutral-50/10">
 <td className="py-3 px-4 font-bold text-neutral-700">{change.field}</td>
 <td className="py-3 px-4 text-neutral-500 line-through truncate max-w-[120px]" title={change.oldVal}>{change.oldVal}</td>
 <td className="py-3 px-4 text-primary font-semibold truncate max-w-[120px]" title={change.newVal}>{change.newVal}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 <div className="flex gap-3 pt-5 border-t border-neutral-100 mt-5">
 <button
 type="button"
 onClick={() => setReviewPanelOpen(false)}
 className="flex-1 py-3 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-800 transition-all cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={confirmSaveSubmit}
 disabled={saving}
 className="flex-1 py-3 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
 >
 {saving ? <RefreshCw className="animate-spin" size={13} /> : <span>Confirm & Save</span>}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* DIALOG 2: DISCARD CHANGES WARNING OVERLAY */}
 {/* ========================================================================= */}
 {discardWarningOpen && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background backdrop-blur-md animate-fade-in">
 <div className="fixed inset-0" onClick={() => setDiscardWarningOpen(false)} />
 
 <div className="w-full max-w-sm bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-2xl relative z-10 animate-scale-up text-center">
 <AlertTriangle className="text-amber-700 mx-auto mb-3" size={36} />
 <h3 className="text-sm font-extrabold text-neutral-900">Unsaved Changes</h3>
 <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
 You have modified configurations that are not saved yet. Are you sure you want to discard your updates?
 </p>

 <div className="flex gap-3 pt-5 mt-3">
 <button
 type="button"
 onClick={() => setDiscardWarningOpen(false)}
 className="flex-1 py-3 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 transition-all cursor-pointer"
 >
 Continue Editing
 </button>
 <button
 type="button"
 onClick={confirmDiscard}
 className="flex-1 py-3 bg-danger hover:bg-red-600 text-xs font-bold text-white rounded-xl shadow transition-all cursor-pointer"
 >
 Discard Changes
 </button>
 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* DIALOG 3: SUCCESS STATE MODAL PANEL */}
 {/* ========================================================================= */}
 {successStateOpen && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background backdrop-blur-md animate-fade-in">
 <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-3xl p-7 shadow-2xl text-center relative animate-scale-up">
 
 <div className="w-14 h-14 bg-success-light border border-green-200 rounded-2xl flex items-center justify-center mx-auto text-success mb-4 animate-bounce">
 <Check size={28} />
 </div>

 <h3 className="text-base font-extrabold text-neutral-900">Organization Updated Successfully</h3>
 <p className="text-xs text-neutral-600 mt-1.5">Tenancy system settings and branding configs have been updated.</p>

 {/* Audit Summary Box */}
 <div className="my-5 p-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-left text-[11px] space-y-2.5">
 <div className="flex justify-between">
 <span className="text-neutral-500">Updated By:</span>
 <span className="font-semibold text-neutral-700">{successInfo?.user}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Updated Time:</span>
 <span className="font-mono text-neutral-600">{successInfo?.time}</span>
 </div>
 <div className="border-t border-neutral-100 pt-2.5">
 <span className="block text-[8px] font-bold text-neutral-500 uppercase mb-1">Changes Applied</span>
 <div className="max-h-[80px] overflow-y-auto scrollbar-thin space-y-1 pr-1">
 {modifiedFields.map((change, idx) => (
 <div key={idx} className="flex justify-between text-[10px]">
 <span className="text-neutral-600 font-medium">{change.field}</span>
 <span className="text-success font-semibold">Updated</span>
 </div>
 ))}
 </div>
 </div>
 </div>

 <div className="flex gap-3">
 <button
 type="button"
 onClick={() => {
 setSuccessStateOpen(false);
 loadData();
 }}
 className="flex-1 py-3 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 transition-all cursor-pointer"
 >
 Continue Editing
 </button>
 <button
 type="button"
 onClick={() => router.push('/workspace/organization/details')}
 className="flex-1 py-3 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
 >
 View Organization
 </button>
 </div>
 </div>
 </div>
 )}

 </div>
 );
}
