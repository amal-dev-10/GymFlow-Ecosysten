'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
 MapPin,
 Building2,
 Phone,
 Mail,
 Clock,
 Briefcase,
 Sliders,
 Check,
 ChevronRight,
 ChevronLeft,
 AlertTriangle,
 Sparkles,
 Info,
 Layers,
 Search,
 CheckCircle,
 HelpCircle,
 Globe,
 UploadCloud,
 Users,
 DollarSign,
 TrendingUp,
 Activity,
 Calendar,
 Lock,
 Trash2,
 Settings,
 Plus,
 RefreshCw,
 SlidersHorizontal,
 FileText,
 UserCheck,
 Image as ImageIcon
} from 'lucide-react';
import { gymApi, rolesApi, orgApi } from '../../../../lib/api';
import { handleApiError } from '../../../../lib/api/client';

interface Employee {
 id: string;
 name: string;
 role?: string;
 email?: string;
 phone?: string;
}

interface GymBranch {
 id: string;
 organizationId: string;
 name: string;
 code: string | null;
 address: string | null;
 latitude: number | null;
 longitude: number | null;
 contactPhone: string | null;
 contactEmail: string | null;
 settings: any;
 createdAt: string;
 updatedAt: string;
}

export default function EditGymBranchPage() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const branchIdParam = searchParams.get('id');
 const gymIdParam = searchParams.get('gymId');

 // Page States
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [activeTab, setActiveTab] = useState<'info' | 'location' | 'hours' | 'staff' | 'services' | 'media' | 'settings' | 'metrics' | 'timeline'>('info');
 const [gymBranches, setGymBranches] = useState<GymBranch[]>([]);
 const [selectedBranchId, setSelectedBranchId] = useState<string>('');
 const [employees, setEmployees] = useState<Employee[]>([]);
 const [auditLogs, setAuditLogs] = useState<any[]>([]);
 const [orgId, setOrgId] = useState<string>('');
 const [orgName, setOrgName] = useState<string>('');
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
 const [showReviewModal, setShowReviewModal] = useState(false);
 const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

 // Media & Metrics Management States
 const [activeCategory, setActiveCategory] = useState<string>('all');
 const [selectedViewerItem, setSelectedViewerItem] = useState<any | null>(null);
 const [itemToDelete, setItemToDelete] = useState<any | null>(null);
 const [uploadProgress, setUploadProgress] = useState<number | null>(null);
 const [metrics, setMetrics] = useState<any | null>(null);

 // Original Data backup (for review panel comparison)
 const [originalData, setOriginalData] = useState<any>(null);

 // Editable Form Data
 const [formData, setFormData] = useState({
 // Identity
 name: '',
 code: '',
 description: '',
 type: 'Standard Club',
 status: 'Active',
 logoOption: 'preset-orange',

 // Branding Colors
 bannerColor: '#f43f5e',

 // Contact
 phone: '',
 supportPhone: '',
 email: '',
 website: '',
 whatsappNumber: '',
 emergencyContact: '',

 // Location
 addressLine1: '',
 addressLine2: '',
 city: '',
 district: '',
 state: '',
 postalCode: '',
 country: 'United States',
 landmark: '',
 latitude: 37.7749,
 longitude: -122.4194,

 // Operating Hours
 operatingHours: {
 monday: { open: '06:00', close: '22:00', closed: false },
 tuesday: { open: '06:00', close: '22:00', closed: false },
 wednesday: { open: '06:00', close: '22:00', closed: false },
 thursday: { open: '06:00', close: '22:00', closed: false },
 friday: { open: '06:00', close: '22:00', closed: false },
 saturday: { open: '08:00', close: '20:00', closed: false },
 sunday: { open: '08:00', close: '18:00', closed: false }
 },
 holidayOverrides: false,

 // Manager
 managerId: '',

 // Services & Amenities
 services: [] as string[],
 amenities: [] as string[],

 // Media & Branding
 logoUrl: '',
 bannerUrl: '',
 primaryColor: '#f43f5e',
 secondaryColor: '#fb923c',
 accentColor: '#10b981',
 watermarkEnabled: false,
 watermarkType: 'logo',
 gallery: [] as any[],

 // Settings
 currency: 'USD',
 timezone: 'America/New_York',
 attendanceMode: 'QR Code Scan',
 invoicePrefix: 'INV-',
 receiptPrefix: 'REC-',
 memberPrefix: 'MEM-',
 capacity: 500,
 peakCapacity: 150
 });

 const availableServices = [
 { id: 'gym_access', label: 'Gym Access', desc: 'Standard entry and facility usage' },
 { id: 'personal_training', label: 'Personal Training', desc: '1-on-1 coaching plans' },
 { id: 'group_classes', label: 'Group Fitness Classes', desc: 'Yoga, Pilates, Zumba, HIIT, spin, step' },
 { id: 'crossfit', label: 'CrossFit Arena', desc: 'Olympic lifting and metabolic conditioning' },
 { id: 'swimming_pool', label: 'Aquatic Center', desc: 'Lap pools & swimming lessons' },
 { id: 'spa_sauna', label: 'Spa & Steam Room', desc: 'Therapeutic and recovery suites' },
 { id: 'nutrition_consult', label: 'Dietary Consultancy', desc: 'Custom meal plans and guides' },
 { id: 'sports_training', label: 'Sports Training', desc: 'Athletic agility workouts' }
 ];

 const availableAmenities = [
 { id: 'lockers', label: 'Digital Lockers' },
 { id: 'showers', label: 'Premium Showers' },
 { id: 'parking', label: 'Free Parking Space' },
 { id: 'wifi', label: 'High-speed Guest Wi-Fi' },
 { id: 'juice_bar', label: 'Organic Juice & Protein Bar' },
 { id: 'towel_service', label: 'Complimentary Towels' },
 { id: 'kid_zone', label: 'Kids Lounge / Daycare' },
 { id: 'cardio_theater', label: 'Cardio Theater TV Suite' },
 { id: 'steam_room', label: 'Steam Room' },
 { id: 'sauna', label: 'Sauna Cabin' },
 { id: 'pool', label: 'Swimming Pool' },
 { id: 'store', label: 'Supplement Store' },
 { id: 'cafe', label: 'Cafe Bar' },
 { id: 'functional_area', label: 'Functional Training Area' }
 ];

 const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const loadData = async (branchId: string) => {
 try {
 setLoading(true);
 const res = await orgApi.list();
 const currentOrgId = localStorage.getItem('organizationId') || '';
 setOrgId(currentOrgId);
 const matchedOrg = res.find(o => o.id === currentOrgId);
 if (matchedOrg) setOrgName(matchedOrg.name);

 // Load branches
 const branches = await gymApi.list(currentOrgId);
 setGymBranches(branches || []);

 const targetBranchId = branchId || '';
 setSelectedBranchId(targetBranchId);

 if (targetBranchId) {
 const targetBranch = branches.find(b => b.id === targetBranchId);
 if (targetBranch) {
 const s = targetBranch.settings || {};

 // Parse address (split by comma if needed)
 const addrParts = targetBranch.address ? targetBranch.address.split(', ') : [];
 const line1 = addrParts[0] || '';
 const line2 = addrParts.length > 4 ? addrParts[1] : '';
 const city = addrParts[addrParts.length - 3] || '';
 const stateZip = addrParts[addrParts.length - 2] || '';
 const state = stateZip.split(' ')[0] || '';
 const postalCode = stateZip.split(' ')[1] || '';
 const country = addrParts[addrParts.length - 1] || 'United States';

 const mappedData = {
 name: targetBranch.name || '',
 code: targetBranch.code || '',
 description: s.description || '',
 type: s.type || 'Standard Club',
 status: s.status || 'Active',
 logoOption: s.logoOption || 'preset-orange',
 bannerColor: s.bannerColor || '#f43f5e',

 phone: targetBranch.contactPhone || '',
 supportPhone: s.supportPhone || '',
 email: targetBranch.contactEmail || '',
 website: s.website || '',
 whatsappNumber: s.whatsappNumber || '',
 emergencyContact: s.emergencyContact || '',

 addressLine1: line1,
 addressLine2: line2,
 city: city,
 district: s.district || '',
 state: state,
 postalCode: postalCode,
 country: country,
 landmark: s.landmark || '',
 latitude: targetBranch.latitude || 37.7749,
 longitude: targetBranch.longitude || -122.4194,

 operatingHours: s.operatingHours || {
 monday: { open: '06:00', close: '22:00', closed: false },
 tuesday: { open: '06:00', close: '22:00', closed: false },
 wednesday: { open: '06:00', close: '22:00', closed: false },
 thursday: { open: '06:00', close: '22:00', closed: false },
 friday: { open: '06:00', close: '22:00', closed: false },
 saturday: { open: '08:00', close: '20:00', closed: false },
 sunday: { open: '08:00', close: '18:00', closed: false }
 },
 holidayOverrides: s.holidayOverrides || false,

 managerId: s.managerId || '',

 services: s.services || [],
 amenities: s.amenities || [],

 logoUrl: s.logoUrl || '',
 bannerUrl: s.bannerUrl || '',
 primaryColor: s.primaryColor || '#f43f5e',
 secondaryColor: s.secondaryColor || '#fb923c',
 accentColor: s.accentColor || '#10b981',
 watermarkEnabled: s.watermarkEnabled || false,
 watermarkType: s.watermarkType || 'logo',
 gallery: s.gallery || [],

 currency: s.currency || 'USD',
 timezone: s.timezone || 'America/New_York',
 attendanceMode: s.attendanceMode || 'QR Code Scan',
 invoicePrefix: s.invoicePrefix || 'INV-',
 receiptPrefix: s.receiptPrefix || 'REC-',
 memberPrefix: s.memberPrefix || s.membershipPrefix || 'MEM-',
 capacity: s.capacity || 500,
 peakCapacity: s.peakCapacity || 150
 };

 setFormData(mappedData);
 setOriginalData(mappedData);
 }
 }

 // Load employees for manager selection
 const staff = await rolesApi.getEmployees();
 setEmployees(staff || []);

 // Load audit logs
 const logs = await rolesApi.getAuditLogs();
 const filteredLogs = logs.filter(l => l.entityType === 'Gym' && l.entityId === targetBranchId);
 setAuditLogs(filteredLogs);

 // Load branch metrics
 try {
 const metricsData = await gymApi.getMetrics(targetBranchId);
 setMetrics(metricsData);
 } catch (err) {
 console.error('Failed to load metrics:', err);
 }

 } catch (err) {
 console.error(err);
 showToast('Failed to load gym branch details.', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 const resolveAndLoad = async () => {
 try {
 const currentOrgId = localStorage.getItem('organizationId') || '';
 const branches = await gymApi.list(currentOrgId);

 let targetId = branchIdParam;
 if (!targetId && gymIdParam && gymIdParam !== 'all') {
 targetId = gymIdParam;
 }

 const activeGymName = localStorage.getItem('activeGymName') || 'All Gyms';
 if (!targetId && activeGymName !== 'All Gyms') {
 const matched = branches.find((b: any) => b.name === activeGymName);
 if (matched) targetId = matched.id;
 }

 if (!targetId && branches.length > 0) {
 targetId = branches[0].id;
 }

 if (targetId) {
 loadData(targetId);
 } else {
 setLoading(false);
 }
 } catch (err) {
 console.error('Error resolving active branch:', err);
 setLoading(false);
 }
 };

 resolveAndLoad();
 }, [branchIdParam, gymIdParam]);

 useEffect(() => {
 const tab = searchParams.get('tab');
 if (tab && ['info', 'location', 'hours', 'staff', 'services', 'media', 'settings', 'metrics', 'timeline'].includes(tab)) {
 setActiveTab(tab as any);
 }
 }, [searchParams]);

 const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 if (file.size > 5 * 1024 * 1024) {
 showToast('Logo file size must be less than 5MB', 'error');
 return;
 }
 const reader = new FileReader();
 reader.onloadend = () => {
 setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
 showToast('Logo loaded successfully! Save changes to commit.', 'success');
 };
 reader.readAsDataURL(file);
 }
 };

 const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 if (file.size > 10 * 1024 * 1024) {
 showToast('Banner file size must be less than 10MB', 'error');
 return;
 }
 const reader = new FileReader();
 reader.onloadend = () => {
 setFormData(prev => ({ ...prev, bannerUrl: reader.result as string }));
 showToast('Banner loaded successfully! Save changes to commit.', 'success');
 };
 reader.readAsDataURL(file);
 }
 };

 const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files;
 if (files && files.length > 0) {
 Array.from(files).forEach(file => {
 if (file.size > 10 * 1024 * 1024) {
 showToast(`File ${file.name} exceeds 10MB limit`, 'error');
 return;
 }
 const reader = new FileReader();
 reader.onloadend = () => {
 const newImg = {
 id: String(Date.now() + Math.random()),
 url: reader.result as string,
 name: file.name,
 category: activeCategory === 'all' ? 'Interior' : activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1),
 fileSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
 resolution: '1920x1080',
 uploadedBy: 'Marcus Vance',
 createdAt: new Date().toISOString()
 };
 setFormData(prev => ({ ...prev, gallery: [...(prev.gallery || []), newImg] }));
 showToast(`Added ${file.name} to gallery! Save changes to commit.`, 'success');
 };
 reader.readAsDataURL(file);
 });
 }
 };

 const handleGalleryDrop = (e: React.DragEvent) => {
 e.preventDefault();
 const files = e.dataTransfer.files;
 if (files && files.length > 0) {
 Array.from(files).forEach(file => {
 if (file.size > 10 * 1024 * 1024) {
 showToast(`File ${file.name} exceeds 10MB limit`, 'error');
 return;
 }
 const reader = new FileReader();
 reader.onloadend = () => {
 const newImg = {
 id: String(Date.now() + Math.random()),
 url: reader.result as string,
 name: file.name,
 category: activeCategory === 'all' ? 'Interior' : activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1),
 fileSize: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
 resolution: '1920x1080',
 uploadedBy: 'Marcus Vance',
 createdAt: new Date().toISOString()
 };
 setFormData(prev => ({ ...prev, gallery: [...(prev.gallery || []), newImg] }));
 showToast(`Dropped ${file.name} to gallery! Save changes to commit.`, 'success');
 };
 reader.readAsDataURL(file);
 });
 }
 };

 const handleSetFeatured = (itemId: string) => {
 const nextGallery = formData.gallery.map(item => ({
 ...item,
 featured: item.id === itemId
 }));
 setFormData(prev => ({ ...prev, gallery: nextGallery }));
 showToast('Featured gallery image changed! Save changes to apply.', 'success');
 };

 const handleDeleteItem = () => {
 if (itemToDelete) {
 const nextGallery = formData.gallery.filter(item => item.id !== itemToDelete.id);
 setFormData(prev => ({ ...prev, gallery: nextGallery }));
 setItemToDelete(null);
 showToast('Gallery image deleted. Save changes to apply.', 'success');
 }
 };

 const handleCopyHours = () => {
 const monHours = formData.operatingHours.monday;
 setFormData(prev => ({
 ...prev,
 operatingHours: {
 monday: { ...monHours },
 tuesday: { ...monHours },
 wednesday: { ...monHours },
 thursday: { ...monHours },
 friday: { ...monHours },
 saturday: { ...monHours },
 sunday: { ...monHours }
 }
 }));
 showToast('Monday operating hours copied to all weekdays!', 'success');
 };

 const handleCheckboxChange = (type: 'services' | 'amenities', value: string) => {
 setFormData(prev => {
 const currentList = prev[type] as string[];
 const newList = currentList.includes(value)
 ? currentList.filter(item => item !== value)
 : [...currentList, value];
 return { ...prev, [type]: newList };
 });
 };

 // Identify modified fields
 const getModifiedFields = () => {
 if (!originalData) return [];
 const fields: { name: string; old: string; new: string }[] = [];

 const formatVal = (val: any) => {
 if (typeof val === 'object') return JSON.stringify(val);
 return String(val);
 };

 Object.keys(formData).forEach(key => {
 const k = key as keyof typeof formData;
 const oldVal = formatVal(originalData[k]);
 const newVal = formatVal(formData[k]);
 if (oldVal !== newVal) {
 let label = key.replace(/([A-Z])/g, ' $1').toLowerCase();
 label = label.charAt(0).toUpperCase() + label.slice(1);
 fields.push({
 name: label,
 old: oldVal.length > 50 ? oldVal.slice(0, 50) + '...' : oldVal,
 new: newVal.length > 50 ? newVal.slice(0, 50) + '...' : newVal
 });
 }
 });

 return fields;
 };

 const validateForm = () => {
 if (!formData.name.trim()) {
 showToast('Branch Name is required.', 'error');
 return false;
 }
 return true;
 };

 const handleSaveChanges = () => {
 if (validateForm()) {
 const diffs = getModifiedFields();
 if (diffs.length === 0) {
 showToast('No modifications detected.', 'info');
 return;
 }
 setShowReviewModal(true);
 }
 };

 const handleConfirmSubmit = async () => {
 try {
 setSaving(true);
 setShowReviewModal(false);

 const addressString = `${formData.addressLine1}${formData.addressLine2 ? ', ' + formData.addressLine2 : ''}, ${formData.city}, ${formData.state} ${formData.postalCode}, ${formData.country}`;

 const payload = {
 name: formData.name,
 code: formData.code,
 address: addressString,
 latitude: Number(formData.latitude),
 longitude: Number(formData.longitude),
 contactPhone: formData.phone,
 contactEmail: formData.email,
 settings: {
 description: formData.description,
 type: formData.type,
 status: formData.status,
 logoOption: formData.logoOption,
 bannerColor: formData.bannerColor,
 supportPhone: formData.supportPhone,
 whatsappNumber: formData.whatsappNumber,
 emergencyContact: formData.emergencyContact,
 district: formData.district,
 landmark: formData.landmark,
 operatingHours: formData.operatingHours,
 holidayOverrides: formData.holidayOverrides,
 managerId: formData.managerId,
 services: formData.services,
 amenities: formData.amenities,
 logoUrl: formData.logoUrl,
 bannerUrl: formData.bannerUrl,
 primaryColor: formData.primaryColor,
 secondaryColor: formData.secondaryColor,
 accentColor: formData.accentColor,
 watermarkEnabled: formData.watermarkEnabled,
 watermarkType: formData.watermarkType,
 gallery: formData.gallery,
 currency: formData.currency,
 timezone: formData.timezone,
 attendanceMode: formData.attendanceMode,
 invoicePrefix: formData.invoicePrefix,
 receiptPrefix: formData.receiptPrefix,
 memberPrefix: formData.memberPrefix,
 membershipPrefix: formData.memberPrefix,
 capacity: formData.capacity,
 peakCapacity: formData.peakCapacity
 }
 };

 await gymApi.update(selectedBranchId, payload);
 setShowSuccessOverlay(true);
 setOriginalData({ ...formData });

 // Reload audit timeline
 const logs = await rolesApi.getAuditLogs();
 const filteredLogs = logs.filter(l => l.entityType === 'Gym' && l.entityId === selectedBranchId);
 setAuditLogs(filteredLogs);
 } catch (err: any) {
 console.error(err);
 showToast(handleApiError(err) || 'Failed to update gym branch.', 'error');
 } finally {
 setSaving(false);
 }
 };

 const selectedManager = employees.find(e => e.id === formData.managerId);
 const changedFields = getModifiedFields();

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Loading Branch Details Dashboard...
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-white text-neutral-900 flex relative overflow-hidden">

 {/* Toast Notification */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 border ${toast.type === 'success'
 ? 'bg-success-light text-success border-green-200'
 : toast.type === 'error'
 ? 'bg-danger-light text-danger border-red-200'
 : 'bg-neutral-50/95 text-neutral-800 border-neutral-200/50'
 }`}>
 {toast.type === 'success' ? (
 <CheckCircle className="w-5 h-5 text-success" />
 ) : toast.type === 'error' ? (
 <AlertTriangle className="w-5 h-5 text-danger" />
 ) : (
 <Info className="w-5 h-5 text-neutral-600" />
 )}
 <span className="text-sm font-medium">{toast.message}</span>
 </div>
 )}

 {/* LEFT FORM TABS NAVIGATION */}
 <div className="w-64 border-r border-neutral-200/80 bg-neutral-50/20 backdrop-blur-md flex flex-col justify-between shrink-0">
 <div className="p-6">
 <div className="flex items-center gap-2 text-[10px] text-danger font-bold uppercase tracking-wider mb-4">
 <Building2 className="w-3.5 h-3.5" />
 <span>{orgName}</span>
 </div>

 <span className="text-[10px] text-neutral-500 font-mono block uppercase tracking-wider mb-3">Sections</span>
 <nav className="space-y-1">
 {[
 { id: 'info', label: 'Identity & Status', icon: Building2 },
 { id: 'location', label: 'Contact & Location', icon: MapPin },
 { id: 'hours', label: 'Hours & Manager', icon: Clock },
 { id: 'services', label: 'Services & Facilities', icon: Sliders },
 { id: 'media', label: 'Media & Branding', icon: ImageIcon },
 { id: 'settings', label: 'Settings', icon: Settings },
 { id: 'metrics', label: 'Performance Snap', icon: Activity },
 { id: 'timeline', label: 'Audit Timeline', icon: Calendar }
 ].map(tab => (
 <button
 key={tab.id}
 type="button"
 onClick={() => setActiveTab(tab.id as any)}
 className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${activeTab === tab.id
 ? 'bg-danger-light text-danger border border-red-200'
 : 'text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50/60'
 }`}
 >
 <tab.icon className="w-4 h-4" />
 {tab.label}
 </button>
 ))}
 </nav>
 </div>

 <div className="p-4 border-t border-neutral-200/80 space-y-2">
 {changedFields.length > 0 && (
 <div className="bg-warning-light border border-amber-200 rounded-xl p-3 text-[10px] text-amber-700">
 <span className="font-bold block">Unsaved Changes</span>
 You have {changedFields.length} unsaved modifications.
 </div>
 )}
 <button
 type="button"
 onClick={handleSaveChanges}
 className="w-full py-2 bg-primary text-neutral-900 text-xs font-semibold rounded-xl hover:bg-primary-hover transition shadow-lg"
 >
 Save Changes
 </button>
 <button
 type="button"
 onClick={() => {
 setFormData({ ...originalData });
 showToast('Changes discarded successfully!', 'info');
 }}
 disabled={changedFields.length === 0}
 className="w-full py-2 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-800 disabled:opacity-50 text-xs font-semibold rounded-xl transition"
 >
 Discard Changes
 </button>
 </div>
 </div>

 {/* RIGHT WORKSPACE SCROLL */}
 <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">

 {/* HEADER */}
 <div className="flex items-center justify-between border-b border-neutral-200/80 pb-6">
 <div>
 <h1 className="text-2xl font-bold text-neutral-900 font-display">Edit Gym Branch</h1>
 <p className="text-xs text-neutral-600 mt-1">Configure physical identifiers, operating hours, active services, staff roles, and limits.</p>
 </div>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => router.push('/workspace/organization/details')}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 View Branch Overview
 </button>
 </div>
 </div>

 {/* BRANCH METADATA OVERVIEW CARD */}
 <div className="bg-neutral-50/40 border border-neutral-200/80 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-danger-light border border-red-200 flex items-center justify-center text-danger">
 <Building2 className="w-6 h-6" />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h3 className="text-base font-bold text-neutral-900">{formData.name}</h3>
 <span className="text-xs font-mono bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-lg border border-neutral-200">{formData.code}</span>
 </div>
 <div className="flex items-center gap-4 text-[10px] text-neutral-500 mt-1.5">
 <span>Status: <strong className={`font-semibold ${formData.status === 'Active' ? 'text-success' : 'text-danger'}`}>{formData.status}</strong></span>
 <span>•</span>
 <span>Manager: <strong>{selectedManager ? selectedManager.name : 'Unassigned'}</strong></span>
 </div>
 </div>
 </div>

 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => setActiveTab('staff')}
 className="px-3 py-1.5 bg-neutral-100/60 hover:bg-neutral-50 border border-neutral-200/60 rounded-xl text-[10px] text-neutral-700 transition"
 >
 Manage Staff
 </button>
 <button
 type="button"
 onClick={() => router.push(`/workspace/members`)}
 className="px-3 py-1.5 bg-neutral-100/60 hover:bg-neutral-50 border border-neutral-200/60 rounded-xl text-[10px] text-neutral-700 transition"
 >
 View Members
 </button>
 </div>
 </div>
 </div>

 {/* TAB CONTENTS CONTAINER */}
 <div className="bg-neutral-50/20 border border-neutral-200/60 rounded-3xl p-8 backdrop-blur-md">

 {/* TAB 1: IDENTITY & STATUS */}
 {activeTab === 'info' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
 <Building2 className="w-5 h-5 text-danger" />
 Branch Information & Identity
 </h3>
 <p className="text-xs text-neutral-600 mt-1">Configure status levels, descriptions, branding options and code definitions.</p>
 </div>

 {/* Status Selector & Impact Warning */}
 <div className="grid grid-cols-3 gap-6 items-start">
 <div className="space-y-2 col-span-1">
 <label className="text-xs text-neutral-700 font-semibold">Operational Status</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.status}
 onChange={e => setFormData({ ...formData, status: e.target.value })}
 >
 <option value="Active">Active</option>
 <option value="Inactive">Inactive</option>
 <option value="Under Maintenance">Under Maintenance</option>
 <option value="Temporarily Closed">Temporarily Closed</option>
 </select>
 </div>

 {formData.status !== 'Active' && (
 <div className="col-span-2 bg-danger-light border border-red-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-danger">
 <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5 animate-pulse" />
 <div>
 <span className="font-bold block">Status Change Impact Alert</span>
 {formData.status === 'Temporarily Closed' && (
 <ul className="list-disc pl-4 mt-1 space-y-1 text-[11px] text-danger">
 <li>Attendance tracking scan points will be disabled instantly.</li>
 <li>New membership sales and branch check-ins are restricted.</li>
 <li>Existing memberships remain frozen or preserved under current billing rules.</li>
 </ul>
 )}
 {formData.status === 'Inactive' && (
 <p className="text-[11px] text-danger mt-1">
 Hides this branch completely from user profiles, client booking channels, and prevents all employee/member actions.
 </p>
 )}
 {formData.status === 'Under Maintenance' && (
 <p className="text-[11px] text-danger mt-1">
 Displays a warning to members in client booking apps, disabling reservations for pool/spa classes but keeping regular access gates operational.
 </p>
 )}
 </div>
 </div>
 )}
 </div>

 <div className="grid grid-cols-3 gap-6">
 <div className="col-span-2 space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Branch Name <span className="text-danger">*</span></label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-red-200"
 value={formData.name}
 onChange={e => setFormData({ ...formData, name: e.target.value })}
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Location Code <span className="text-danger">*</span></label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none font-mono uppercase"
 value={formData.code}
 onChange={e => setFormData({ ...formData, code: e.target.value })}
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Description</label>
 <textarea
 rows={3}
 className="w-full bg-white border border-neutral-200 rounded-xl p-4 text-sm text-neutral-900 focus:outline-none"
 value={formData.description}
 onChange={e => setFormData({ ...formData, description: e.target.value })}
 />
 </div>

 {/* Branding Section */}
 <div className="border-t border-neutral-200/80 pt-6 space-y-4">
 <span className="text-xs font-bold text-neutral-700 block uppercase tracking-wider">Branch Branding Accent Colors</span>
 <div className="grid grid-cols-3 gap-6 items-center">
 <div className="space-y-2">
 <label className="text-xs text-neutral-600">Accent Colors Group</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.logoOption}
 onChange={e => setFormData({ ...formData, logoOption: e.target.value })}
 >
 <option value="preset-orange">Warm Orange Theme</option>
 <option value="preset-rose">Rose Red Theme</option>
 <option value="preset-violet">Violet Cyber Theme</option>
 <option value="preset-emerald">Emerald Fitness Theme</option>
 </select>
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-600">Custom Banner Hex Color</label>
 <div className="flex gap-2 items-center">
 <input
 type="color"
 className="w-10 h-10 bg-transparent border-0 cursor-pointer"
 value={formData.bannerColor}
 onChange={e => setFormData({ ...formData, bannerColor: e.target.value })}
 />
 <input
 type="text"
 className="w-24 bg-white border border-neutral-200 rounded-xl p-2 text-xs text-neutral-900 font-mono text-center uppercase"
 value={formData.bannerColor}
 onChange={e => setFormData({ ...formData, bannerColor: e.target.value })}
 />
 </div>
 </div>

 {/* Brand Preview Panel */}
 <div className="border border-neutral-200 rounded-2xl p-4 bg-neutral-50/65 flex flex-col justify-between h-20">
 <span className="text-[10px] text-neutral-500 font-mono">Mobile Theme Header Preview</span>
 <div className="flex gap-2 items-center">
 <div className="w-6 h-6 rounded-full" style={{ backgroundColor: formData.bannerColor }} />
 <span className="text-xs font-bold text-neutral-800">{formData.name || 'Branch Preview'}</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* TAB 2: CONTACT & LOCATION */}
 {activeTab === 'location' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
 <MapPin className="w-5 h-5 text-danger" />
 Contact Info & Location Parameters
 </h3>
 <p className="text-xs text-neutral-600 mt-1">Specify detailed address layouts, landmarks, support phones, and geolocation locks.</p>
 </div>

 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Contact Phone <span className="text-danger">*</span></label>
 <input
 type="tel"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.phone}
 onChange={e => setFormData({ ...formData, phone: e.target.value })}
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Support Contact Number</label>
 <input
 type="tel"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.supportPhone}
 onChange={e => setFormData({ ...formData, supportPhone: e.target.value })}
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Contact Email</label>
 <input
 type="email"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.email}
 onChange={e => setFormData({ ...formData, email: e.target.value })}
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Official Website</label>
 <input
 type="url"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.website}
 onChange={e => setFormData({ ...formData, website: e.target.value })}
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-6 border-t border-neutral-200/80 pt-6">
 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Street Address Line 1 <span className="text-danger">*</span></label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.addressLine1}
 onChange={e => setFormData({ ...formData, addressLine1: e.target.value })}
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Street Address Line 2</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.addressLine2}
 onChange={e => setFormData({ ...formData, addressLine2: e.target.value })}
 />
 </div>
 </div>

 <div className="grid grid-cols-4 gap-4">
 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">City</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.city}
 onChange={e => setFormData({ ...formData, city: e.target.value })}
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">District/County</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.district}
 onChange={e => setFormData({ ...formData, district: e.target.value })}
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">State</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.state}
 onChange={e => setFormData({ ...formData, state: e.target.value })}
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Postal Code</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.postalCode}
 onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
 />
 </div>
 </div>

 {/* Coordinates */}
 <div className="bg-neutral-50/40 border border-neutral-200 rounded-2xl p-5 space-y-4">
 <span className="text-xs font-bold text-neutral-700 block uppercase tracking-wider">Map Coordinates Geofencing</span>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-[10px] text-neutral-500 font-mono">Latitude</label>
 <input
 type="number"
 step="0.000001"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none font-mono"
 value={formData.latitude}
 onChange={e => setFormData({ ...formData, latitude: Number(e.target.value) })}
 />
 </div>
 <div className="space-y-2">
 <label className="text-[10px] text-neutral-500 font-mono">Longitude</label>
 <input
 type="number"
 step="0.000001"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none font-mono"
 value={formData.longitude}
 onChange={e => setFormData({ ...formData, longitude: Number(e.target.value) })}
 />
 </div>
 </div>
 </div>
 </div>
 )}

 {/* TAB 3: HOURS & MANAGER */}
 {activeTab === 'hours' && (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
 <Clock className="w-5 h-5 text-danger" />
 Operating hours & Assigned Manager
 </h3>
 <p className="text-xs text-neutral-600 mt-1">Configure weekly opening schedules and assign management authorization levels.</p>
 </div>
 <button
 type="button"
 onClick={handleCopyHours}
 className="text-xs bg-neutral-100 hover:bg-neutral-100 text-danger border border-neutral-200/80 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
 >
 <Clock className="w-3.5 h-3.5" />
 Copy Monday to All
 </button>
 </div>

 {/* Weekly Timetable */}
 <div className="space-y-2 bg-white border border-neutral-200 p-4 rounded-2xl max-h-60 overflow-y-auto">
 {Object.keys(formData.operatingHours).map(day => {
 const d = day as keyof typeof formData.operatingHours;
 const item = formData.operatingHours[d];
 return (
 <div key={day} className="flex items-center justify-between border-b border-neutral-200/40 py-2 last:border-b-0">
 <span className="text-xs font-bold text-neutral-700 capitalize w-24">{day}</span>

 <div className="flex items-center gap-4">
 <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer">
 <input
 type="checkbox"
 checked={item.closed}
 onChange={e => {
 const checked = e.target.checked;
 setFormData(prev => ({
 ...prev,
 operatingHours: {
 ...prev.operatingHours,
 [d]: { ...prev.operatingHours[d], closed: checked }
 }
 }));
 }}
 className="rounded bg-neutral-50 border-neutral-200 text-danger focus:ring-0 focus:ring-offset-0"
 />
 Closed
 </label>

 {!item.closed && (
 <div className="flex items-center gap-2">
 <input
 type="time"
 value={item.open}
 onChange={e => {
 const val = e.target.value;
 setFormData(prev => ({
 ...prev,
 operatingHours: {
 ...prev.operatingHours,
 [d]: { ...prev.operatingHours[d], open: val }
 }
 }));
 }}
 className="bg-neutral-50 border border-neutral-200 text-xs text-neutral-800 px-2 py-1 rounded-lg"
 />
 <span className="text-[10px] text-neutral-500 font-mono">to</span>
 <input
 type="time"
 value={item.close}
 onChange={e => {
 const val = e.target.value;
 setFormData(prev => ({
 ...prev,
 operatingHours: {
 ...prev.operatingHours,
 [d]: { ...prev.operatingHours[d], close: val }
 }
 }));
 }}
 className="bg-neutral-50 border border-neutral-200 text-xs text-neutral-800 px-2 py-1 rounded-lg"
 />
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>

 {/* Manager assignment dropdown */}
 <div className="border-t border-neutral-200/80 pt-6 space-y-4">
 <span className="text-xs font-bold text-neutral-700 block uppercase tracking-wider">Assigned Branch Manager</span>

 <div className="grid grid-cols-2 gap-6 items-start">
 <div className="space-y-2">
 <label className="text-xs text-neutral-600">Select Manager</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-red-200"
 value={formData.managerId}
 onChange={e => setFormData({ ...formData, managerId: e.target.value })}
 >
 <option value="">-- No Manager Assigned --</option>
 {employees.map(emp => (
 <option key={emp.id} value={emp.id}>{emp.name} ({emp.role || 'Staff'})</option>
 ))}
 </select>
 </div>

 {selectedManager ? (
 <div className="bg-danger-light border border-red-200 p-4 rounded-xl space-y-1 text-xs">
 <span className="font-bold text-neutral-800 block">{selectedManager.name}</span>
 <span className="text-neutral-500 block">Role: {selectedManager.role || 'N/A'}</span>
 <span className="text-neutral-500 block">Email: {selectedManager.email || 'N/A'}</span>
 <button
 type="button"
 onClick={() => setFormData({ ...formData, managerId: '' })}
 className="text-[10px] text-danger font-bold hover:text-danger mt-2 block"
 >
 Remove Assigned Manager
 </button>
 </div>
 ) : (
 <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-xs text-neutral-500">
 No manager assigned. General managers and owners will oversee operations.
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* TAB 4: SERVICES & FACILITIES */}
 {activeTab === 'services' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
 <Sliders className="w-5 h-5 text-danger" />
 Services & Facilities Configuration
 </h3>
 <p className="text-xs text-neutral-600 mt-1">Select offered training types and configure amenities for public listings.</p>
 </div>

 <div className="space-y-4">
 <span className="text-xs font-bold text-neutral-700 block uppercase tracking-wider">Fitness Classes & Services</span>
 <div className="grid grid-cols-2 gap-4">
 {availableServices.map(svc => {
 const active = formData.services.includes(svc.id);
 return (
 <div
 key={svc.id}
 onClick={() => handleCheckboxChange('services', svc.id)}
 className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between ${active
 ? 'bg-danger-light border-red-200 text-neutral-900'
 : 'bg-white border-neutral-200/80 text-neutral-600 hover:border-neutral-200'
 }`}
 >
 <div className="pr-4">
 <span className={`text-xs font-bold block ${active ? 'text-danger' : 'text-neutral-700'}`}>{svc.label}</span>
 <span className="text-[10px] text-neutral-500 block mt-1 leading-normal">{svc.desc}</span>
 </div>
 <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${active ? 'bg-danger border-red-200 text-white' : 'border-neutral-200'}`}>
 {active && <Check className="w-3.5 h-3.5" />}
 </div>
 </div>
 );
 })}
 </div>
 </div>

 <div className="space-y-4 border-t border-neutral-200/80 pt-6">
 <span className="text-xs font-bold text-neutral-700 block uppercase tracking-wider">Amenities Infrastructure</span>
 <div className="grid grid-cols-3 gap-3">
 {availableAmenities.map(amenity => {
 const active = formData.amenities.includes(amenity.id);
 return (
 <div
 key={amenity.id}
 onClick={() => handleCheckboxChange('amenities', amenity.id)}
 className={`p-3 rounded-xl border text-center cursor-pointer transition text-xs font-semibold ${active
 ? 'bg-danger-light border-red-200 text-danger'
 : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-200'
 }`}
 >
 {amenity.label}
 </div>
 );
 })}
 </div>
 </div>
 </div>
 )}

 {/* TAB 4.5: MEDIA & BRANDING */}
 {activeTab === 'media' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
 <ImageIcon className="w-5 h-5 text-danger" />
 Media & Branding Assets
 </h3>
 <p className="text-xs text-neutral-600 mt-1">Manage physical identifiers, banner cover templates, and gallery folders.</p>
 </div>

 {/* UPLOAD PROGRESS INDICATION BAR */}
 {uploadProgress !== null && (
 <div className="bg-white border border-red-200 p-4 rounded-2xl flex items-center justify-between gap-4">
 <span className="text-xs text-danger font-bold">Uploading Brand Asset...</span>
 <div className="flex-1 h-1 bg-neutral-50 rounded-full overflow-hidden max-w-md">
 <div className="h-full bg-danger" style={{ width: `${uploadProgress}%` }} />
 </div>
 <span className="text-xs text-neutral-500 font-mono">{uploadProgress}%</span>
 </div>
 )}

 {/* LOGO & BANNER PANEL */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 
 {/* LOGO CARD */}
 <div className="bg-white border border-neutral-200/80 p-6 rounded-2xl space-y-4">
 <span className="text-xs font-bold text-neutral-800 block uppercase tracking-wider">Gym Logo Identity</span>
 
 <div className="flex gap-6 items-center">
 <div className="w-20 h-20 rounded-2xl border border-neutral-200 bg-neutral-50 flex items-center justify-center relative overflow-hidden shrink-0">
 {formData.logoUrl ? (
 <img src={formData.logoUrl} alt="Logo" className="object-cover w-full h-full" />
 ) : (
 <Building2 className="w-8 h-8 text-neutral-400" />
 )}
 </div>

 <div className="space-y-1.5 text-[11px]">
 <span className="font-bold text-neutral-700 block">Recommended Specifications</span>
 <span className="text-neutral-500 block leading-normal">PNG or SVG format. Transparent background. Resolution 512x512px. Max file size 10MB.</span>
 </div>
 </div>

 <div className="flex gap-2 pt-2 border-t border-neutral-200/60">
 <input
 id="logo-file-input"
 type="file"
 accept="image/*"
 className="hidden"
 onChange={handleLogoUpload}
 />
 <button
 type="button"
 onClick={() => document.getElementById('logo-file-input')?.click()}
 className="flex-1 py-2 bg-neutral-50 px-3 hover:bg-neutral-50 border border-neutral-200 text-xs font-semibold rounded-xl text-neutral-800 transition"
 >
 Upload Logo
 </button>
 {formData.logoUrl && (
 <button
 type="button"
 onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))}
 className="py-2 px-3 border border-neutral-200 hover:border-red-200 text-danger hover:bg-danger-light text-xs font-semibold rounded-xl transition"
 >
 Remove
 </button>
 )}
 </div>
 </div>

 {/* BANNER CARD */}
 <div className="bg-white border border-neutral-200/80 p-6 rounded-2xl space-y-4">
 <span className="text-xs font-bold text-neutral-800 block uppercase tracking-wider">Cover Banner Template</span>
 
 <div className="h-20 w-full bg-neutral-50 border border-neutral-200 rounded-2xl relative overflow-hidden flex items-center justify-center">
 {formData.bannerUrl ? (
 <img src={formData.bannerUrl} alt="Banner" className="object-cover w-full h-full" />
 ) : (
 <span className="text-xs text-neutral-400 font-mono">No Banner Uploaded</span>
 )}
 </div>

 <div className="flex gap-2 pt-2 text-xs">
 <input
 id="banner-file-input"
 type="file"
 accept="image/*"
 className="hidden"
 onChange={handleBannerUpload}
 />
 <button
 type="button"
 onClick={() => document.getElementById('banner-file-input')?.click()}
 className="flex-1 py-2 bg-neutral-50 px-3 hover:bg-neutral-50 border border-neutral-200 text-xs font-semibold rounded-xl text-neutral-800 transition"
 >
 Upload Banner
 </button>
 {formData.bannerUrl && (
 <button
 type="button"
 onClick={() => setFormData(prev => ({ ...prev, bannerUrl: '' }))}
 className="py-2 px-3 border border-neutral-200 hover:border-red-200 text-danger hover:bg-danger-light text-xs font-semibold rounded-xl transition"
 >
 Remove
 </button>
 )}
 </div>
 </div>

 </div>

 {/* BRAND COLOR ACCENTS */}
 <div className="bg-white border border-neutral-200/80 p-6 rounded-2xl space-y-4">
 <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider block">Brand Color Palette</span>
 
 <div className="grid grid-cols-3 gap-6">
 <div className="space-y-2">
 <label className="text-[10px] text-neutral-500 block font-mono">Primary Color</label>
 <div className="flex gap-2 items-center">
 <input 
 type="color" 
 className="w-10 h-10 bg-transparent border-0 cursor-pointer rounded-lg shrink-0"
 value={formData.primaryColor}
 onChange={e => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
 />
 <input 
 type="text" 
 className="w-full bg-white border border-neutral-200 rounded-xl p-2 text-xs text-neutral-900 font-mono text-center uppercase"
 value={formData.primaryColor}
 onChange={e => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] text-neutral-500 block font-mono">Secondary Color</label>
 <div className="flex gap-2 items-center">
 <input 
 type="color" 
 className="w-10 h-10 bg-transparent border-0 cursor-pointer rounded-lg shrink-0"
 value={formData.secondaryColor}
 onChange={e => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
 />
 <input 
 type="text" 
 className="w-full bg-white border border-neutral-200 rounded-xl p-2 text-xs text-neutral-900 font-mono text-center uppercase"
 value={formData.secondaryColor}
 onChange={e => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] text-neutral-500 block font-mono">Accent Color</label>
 <div className="flex gap-2 items-center">
 <input 
 type="color" 
 className="w-10 h-10 bg-transparent border-0 cursor-pointer rounded-lg shrink-0"
 value={formData.accentColor}
 onChange={e => setFormData(prev => ({ ...prev, accentColor: e.target.value }))}
 />
 <input 
 type="text" 
 className="w-full bg-white border border-neutral-200 rounded-xl p-2 text-xs text-neutral-900 font-mono text-center uppercase"
 value={formData.accentColor}
 onChange={e => setFormData(prev => ({ ...prev, accentColor: e.target.value }))}
 />
 </div>
 </div>
 </div>
 </div>

 {/* GALLERY MANAGEMENT */}
 <div className="bg-white border border-neutral-200/80 p-6 rounded-2xl space-y-6">
 
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-200/40 pb-4">
 <div>
 <span className="text-xs font-bold text-neutral-800 block uppercase tracking-wider">Branch Gallery Grid</span>
 <span className="text-[10px] text-neutral-500 block mt-0.5">Manage physical training rooms, pool, and facilities photos.</span>
 </div>

 {/* Category Filter selector */}
 <div className="flex flex-wrap gap-1 text-[10px]">
 {['all', 'interior', 'exterior', 'equipment', 'facilities'].map(c => (
 <button
 key={c}
 type="button"
 onClick={() => setActiveCategory(c)}
 className={`px-2.5 py-1 rounded-lg border font-semibold capitalize transition ${
 activeCategory === c 
 ? 'border-red-200 bg-danger-light text-danger' 
 : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-200'
 }`}
 >
 {c}
 </button>
 ))}
 </div>
 </div>

 {/* DRAG AND DROP ZONE */}
 <input
 id="gallery-file-input"
 type="file"
 accept="image/*"
 multiple
 className="hidden"
 onChange={handleGalleryUpload}
 />
 <div 
 onClick={() => document.getElementById('gallery-file-input')?.click()}
 onDragOver={(e) => e.preventDefault()}
 onDrop={handleGalleryDrop}
 className="border-2 border-neutral-200 border-dashed rounded-2xl p-6 text-center hover:border-red-200 cursor-pointer transition flex flex-col items-center"
 >
 <UploadCloud className="w-8 h-8 text-neutral-400 mb-2" />
 <span className="text-xs font-bold text-neutral-700 block">Drag & Drop photos here, or click to browse</span>
 <span className="text-[10px] text-neutral-500 block mt-1">Recommended: JPG, PNG, WEBP. Max size 10MB.</span>
 </div>

 {/* IMAGES GRID */}
 {(!formData.gallery || formData.gallery.length === 0) ? (
 <div className="text-center p-8 text-xs text-neutral-500 italic">
 No gallery photos found. Select"Upload" or click the zone to add.
 </div>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
 {formData.gallery
 .filter(img => activeCategory === 'all' || img.category.toLowerCase() === activeCategory.toLowerCase())
 .map(img => (
 <div key={img.id} className="group bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden relative flex flex-col justify-between">
 
 {/* Thumbnail */}
 <div className="h-28 w-full relative overflow-hidden bg-neutral-50 flex items-center justify-center">
 <img src={img.url} alt={img.name} className="object-cover w-full h-full group-hover:scale-105 transition duration-300" />
 
 {/* Featured Star Banner */}
 {img.featured && (
 <span className="absolute top-2 left-2 bg-primary text-neutral-400 text-[9px] font-bold px-2 py-0.5 rounded-md">
 Featured
 </span>
 )}
 </div>

 {/* Metadata Footer */}
 <div className="p-3 space-y-1">
 <span className="text-[10px] font-bold text-neutral-700 block truncate">{img.name}</span>
 <div className="flex justify-between items-center text-[9px] text-neutral-500">
 <span>{img.category}</span>
 <span>{img.fileSize}</span>
 </div>
 </div>

 {/* Image Hover Actions Row */}
 <div className="p-2 border-t border-neutral-100/40 flex justify-between bg-neutral-50/90 text-[10px]">
 <button
 type="button"
 onClick={() => handleSetFeatured(img.id)}
 disabled={img.featured}
 className={`font-semibold ${img.featured ? 'text-primary' : 'text-neutral-600 hover:text-neutral-800'}`}
 >
 {img.featured ? 'Featured' : 'Make Featured'}
 </button>
 <button
 type="button"
 onClick={() => setItemToDelete(img)}
 className="text-danger hover:text-danger"
 >
 Delete
 </button>
 </div>

 </div>
 ))}
 </div>
 )}

 </div>
 </div>
 )}

 {/* TAB 5: SETTINGS */}
 {activeTab === 'settings' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
 <Settings className="w-5 h-5 text-danger" />
 Branch Serialization & General Defaults
 </h3>
 <p className="text-xs text-neutral-600 mt-1">Configure serial prefix patterns, default timezones, currency, and capacity caps.</p>
 </div>

 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Local Timezone</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.timezone}
 onChange={e => setFormData({ ...formData, timezone: e.target.value })}
 >
 <option value="America/New_York">America/New_York (EST)</option>
 <option value="America/Chicago">America/Chicago (CST)</option>
 <option value="America/Denver">America/Denver (MST)</option>
 <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
 <option value="Europe/London">Europe/London (GMT)</option>
 <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
 </select>
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Financial Currency</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.currency}
 onChange={e => setFormData({ ...formData, currency: e.target.value })}
 >
 <option value="USD">USD ($)</option>
 <option value="EUR">EUR (€)</option>
 <option value="GBP">GBP (£)</option>
 <option value="INR">INR (₹)</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-6 border-t border-neutral-200/80 pt-6">
 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Member ID Prefix</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none font-mono uppercase"
 value={formData.memberPrefix}
 onChange={e => setFormData({ ...formData, memberPrefix: e.target.value })}
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Invoice Serial Prefix</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none font-mono uppercase"
 value={formData.invoicePrefix}
 onChange={e => setFormData({ ...formData, invoicePrefix: e.target.value })}
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Receipt Serial Prefix</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none font-mono uppercase"
 value={formData.receiptPrefix}
 onChange={e => setFormData({ ...formData, receiptPrefix: e.target.value })}
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-6 border-t border-neutral-200/80 pt-6">
 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Max Member Capacity Limit</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.capacity}
 onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Peak Capacity occupancy Alert</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.peakCapacity}
 onChange={e => setFormData({ ...formData, peakCapacity: Number(e.target.value) })}
 />
 </div>
 </div>
 </div>
 )}

 {/* TAB 6: PERFORMANCE SNAPSHOT */}
 {activeTab === 'metrics' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
 <Activity className="w-5 h-5 text-danger" />
 Branch Performance Snapshot
 </h3>
 <p className="text-xs text-neutral-600 mt-1">Real-time indicators reflecting local membership registrations, staff, and financial revenue.</p>
 </div>

 <div className="grid grid-cols-3 gap-6">
 {[
 { label: 'Active Members', value: metrics ? String(metrics.activeMembers) : '...', desc: metrics ? metrics.activeMembersDesc : 'Loading...', icon: Users, color: 'text-success bg-success-light' },
 { label: 'Employees / Staff', value: metrics ? String(metrics.employeesCount) : '...', desc: metrics ? metrics.employeesDesc : 'Loading...', icon: Briefcase, color: 'text-danger bg-danger-light' },
 { label: 'Attendance Today', value: metrics ? String(metrics.attendanceToday) : '...', desc: metrics ? metrics.attendanceDesc : 'Loading...', icon: Clock, color: 'text-amber-700 bg-warning-light' },
 { label: 'Revenue This Month', value: metrics ? new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency || 'USD' }).format(metrics.revenueMonth) : '...', desc: metrics ? metrics.revenueDesc : 'Loading...', icon: DollarSign, color: 'text-indigo-400 bg-indigo-500/10' },
 { label: 'Pending Payments', value: metrics ? new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency || 'USD' }).format(metrics.pendingPayments) : '...', desc: metrics ? metrics.pendingPaymentsDesc : 'Loading...', icon: AlertTriangle, color: 'text-red-400 bg-red-500/10' },
 { label: 'Renewals Pending', value: metrics ? String(metrics.renewalsCount) : '...', desc: metrics ? metrics.renewalsDesc : 'Loading...', icon: RefreshCw, color: 'text-teal-400 bg-teal-500/10' }
 ].map((stat, idx) => (
 <div key={idx} className="bg-white border border-neutral-200 p-5 rounded-2xl flex items-center gap-4">
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
 <stat.icon className="w-5 h-5" />
 </div>
 <div>
 <span className="text-[10px] text-neutral-500 font-medium block uppercase tracking-wider">{stat.label}</span>
 <span className="text-lg font-bold text-neutral-900 block mt-1">{stat.value}</span>
 <span className="text-[10px] text-neutral-600 block mt-0.5">{stat.desc}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* TAB 7: AUDIT TIMELINE */}
 {activeTab === 'timeline' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
 <Calendar className="w-5 h-5 text-danger" />
 Chronological Configuration Changes Log
 </h3>
 <p className="text-xs text-neutral-600 mt-1">Audit log records documenting past updates to branch settings, staff or coordinates.</p>
 </div>

 <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
 {auditLogs.length === 0 ? (
 <div className="text-xs text-neutral-500 italic p-6 border border-neutral-200/40 rounded-2xl bg-white text-center">
 No historical configuration modifications recorded for this branch yet.
 </div>
 ) : (
 auditLogs.map((log, idx) => (
 <div key={log.id || idx} className="bg-white border border-neutral-200 p-4 rounded-xl flex items-start justify-between gap-4">
 <div className="space-y-1">
 <span className="text-xs font-bold text-neutral-800 block">{log.action}</span>
 <p className="text-xs text-neutral-600">{log.details}</p>
 <span className="text-[10px] text-neutral-500 block mt-1">User: <strong className="text-neutral-700">{log.user}</strong></span>
 </div>
 <span className="text-[10px] text-neutral-500 font-mono shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
 </div>
 ))
 )}
 </div>
 </div>
 )}

 </div>

 </div>

 {/* REVIEW CHANGES MODAL */}
 {showReviewModal && (
 <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-6 backdrop-blur-sm">
 <div className="max-w-2xl w-full bg-neutral-50 border border-neutral-200 p-8 rounded-3xl space-y-6 shadow-2xl relative">
 <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
 <SlidersHorizontal className="w-5 h-5 text-danger" />
 Review Modifications Before Saving
 </h3>
 <p className="text-xs text-neutral-600">Please verify the changed values below before applying edits to this gym branch location.</p>

 <div className="border border-neutral-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
 <table className="w-full text-xs text-left border-collapse">
 <thead>
 <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-200">
 <th className="p-3 font-semibold font-mono uppercase tracking-wider">Field Name</th>
 <th className="p-3 font-semibold font-mono uppercase tracking-wider">Previous Value</th>
 <th className="p-3 font-semibold font-mono uppercase tracking-wider">New Value</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/60">
 {changedFields.map((field, idx) => (
 <tr key={idx} className="bg-white hover:bg-neutral-50/20">
 <td className="p-3 font-bold text-neutral-700 capitalize">{field.name}</td>
 <td className="p-3 text-neutral-500 line-through truncate max-w-[150px]">{field.old || 'N/A'}</td>
 <td className="p-3 text-danger font-semibold truncate max-w-[150px]">{field.new || 'N/A'}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 <div className="flex gap-3 pt-4 border-t border-neutral-200/80">
 <button
 type="button"
 onClick={handleConfirmSubmit}
 disabled={saving}
 className="flex-1 py-3 bg-primary hover:bg-primary-hover text-neutral-900 text-xs font-semibold rounded-xl disabled:opacity-50 transition"
 >
 {saving ? 'Saving Changes...' : 'Confirm & Save'}
 </button>
 <button
 type="button"
 onClick={() => setShowReviewModal(false)}
 className="flex-1 py-3 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 text-xs font-semibold rounded-xl transition"
 >
 Go Back to Editing
 </button>
 </div>
 </div>
 </div>
 )}
 {/* SUCCESS OVERLAY OVERLAY */}
 {showSuccessOverlay && (
 <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-6 backdrop-blur-sm">
 <div className="max-w-md w-full bg-neutral-50 border border-neutral-200 p-8 rounded-3xl text-center space-y-6 shadow-2xl relative">
 <div className="w-16 h-16 bg-success-light border border-green-200 rounded-full flex items-center justify-center mx-auto text-success">
 <CheckCircle className="w-8 h-8" />
 </div>

 <div className="space-y-2">
 <span className="text-[10px] bg-success-light text-success border border-green-200 px-2.5 py-1 rounded-full font-mono font-bold uppercase tracking-wider inline-block">
 Updates Saved Successfully
 </span>
 <h3 className="text-xl font-bold text-neutral-900 font-display mt-2">{formData.name}</h3>
 <p className="text-xs text-neutral-600 leading-relaxed max-w-xs mx-auto">
 Branch settings, configurations, coordinates and operating hours updates have been committed to the database.
 </p>
 </div>

 <div className="pt-2 flex flex-col gap-2">
 <button
 type="button"
 onClick={() => {
 setShowSuccessOverlay(false);
 router.push('/workspace/organization/details');
 }}
 className="w-full py-3 bg-primary hover:bg-primary-hover text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Go to Organization Details
 </button>
 <button
 type="button"
 onClick={() => setShowSuccessOverlay(false)}
 className="w-full py-3 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 text-xs font-semibold rounded-xl transition"
 >
 Continue Editing
 </button>
 </div>
 </div>
 </div>
 )}

 {/* DELETE CONFIRMATION MODAL */}
 {itemToDelete && (
 <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-6 backdrop-blur-sm">
 <div className="max-w-md w-full bg-neutral-50 border border-neutral-200 p-6 rounded-3xl text-center space-y-4 shadow-2xl relative">
 <div className="w-12 h-12 bg-danger-light border border-red-200 rounded-full flex items-center justify-center mx-auto text-danger mb-2">
 <Trash2 className="w-6 h-6" />
 </div>

 <div className="space-y-1">
 <h3 className="text-base font-bold text-neutral-900">Confirm Asset Deletion</h3>
 <p className="text-xs text-neutral-600">
 Are you sure you want to permanently delete"{itemToDelete.name}"? This action cannot be undone.
 </p>
 </div>

 {/* Image Preview inside Delete */}
 <div className="h-24 w-32 mx-auto rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 flex items-center justify-center">
 <img src={itemToDelete.url} alt={itemToDelete.name} className="object-cover w-full h-full" />
 </div>

 <div className="flex gap-2 pt-2 text-xs">
 <button
 type="button"
 onClick={handleDeleteItem}
 className="flex-1 py-2.5 bg-danger hover:bg-red-600 text-neutral-900 font-semibold rounded-xl"
 >
 Delete Photo
 </button>
 <button
 type="button"
 onClick={() => setItemToDelete(null)}
 className="flex-1 py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:bg-neutral-100 font-semibold rounded-xl"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 )}

 </div>
 );
}
