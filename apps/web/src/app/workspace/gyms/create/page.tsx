'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
 Globe
} from 'lucide-react';
import { gymApi, rolesApi, orgApi } from '../../../../lib/api';
import { handleApiError } from '../../../../lib/api/client';

interface Employee {
 id: string;
 name: string;
 role?: string;
 email?: string;
}

export default function CreateGymBranchPage() {
 const router = useRouter();
 const [currentStep, setCurrentStep] = useState(1);
 const totalSteps = 8;
 const [loading, setLoading] = useState(false);
 const [employees, setEmployees] = useState<Employee[]>([]);
 const [existingGymsCount, setExistingGymsCount] = useState(0);
 const [orgId, setOrgId] = useState<string>('');
 const [orgName, setOrgName] = useState<string>('');
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
 const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
 const [createdBranchData, setCreatedBranchData] = useState<any>(null);

 // Form State
 const [formData, setFormData] = useState({
 // Step 1: Identity
 name: '',
 code: '',
 description: '',
 type: 'Standard Club',
 logoOption: 'preset-orange',

 // Step 2: Contact
 phone: '',
 email: '',
 supportPhone: '',
 address: '',
 city: '',
 state: '',
 postalCode: '',
 country: 'United States',

 // Step 3: Map Location
 latitude: 37.7749,
 longitude: -122.4194,

 // Step 4: Hours & Capacity
 capacity: 500,
 peakCapacity: 150,
 operatingHours: {
 monday: { open: '06:00', close: '22:00', closed: false },
 tuesday: { open: '06:00', close: '22:00', closed: false },
 wednesday: { open: '06:00', close: '22:00', closed: false },
 thursday: { open: '06:00', close: '22:00', closed: false },
 friday: { open: '06:00', close: '22:00', closed: false },
 saturday: { open: '08:00', close: '20:00', closed: false },
 sunday: { open: '08:00', close: '18:00', closed: false }
 },

 // Step 5: Manager Assignment
 managerId: '',

 // Step 6: Services & Amenities
 services: [] as string[],
 amenities: [] as string[],

 // Step 7: Defaults & Serialization
 memberPrefix: 'MEM-',
 invoicePrefix: 'INV-',
 timezone: 'America/New_York',
 currency: 'USD'
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

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 useEffect(() => {
 const storedOrgId = localStorage.getItem('organizationId');
 const storedOrgName = localStorage.getItem('organizationName') || 'Organization';
 if (storedOrgId) {
 setOrgId(storedOrgId);
 setOrgName(storedOrgName);

 // Fetch existing gyms to check subscription slot warning
 gymApi.list(storedOrgId).then(list => {
 setExistingGymsCount(list?.length || 0);
 }).catch(err => console.error('Failed to load gyms count', err));

 // Fetch potential managers (employees)
 rolesApi.getEmployees().then(data => {
 setEmployees(data || []);
 }).catch(err => console.error('Failed to load employees list', err));
 }
 }, []);

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

 const validateStep = () => {
 if (currentStep === 1) {
 if (!formData.name.trim()) {
 showToast('Please enter a branch name.', 'error');
 return false;
 }
 if (!formData.code.trim()) {
 showToast('Please specify a branch location code.', 'error');
 return false;
 }
 }
 if (currentStep === 2) {
 if (!formData.phone.trim()) {
 showToast('Please enter a phone number.', 'error');
 return false;
 }
 if (!formData.address.trim() || !formData.city.trim() || !formData.state.trim() || !formData.postalCode.trim()) {
 showToast('Full physical address details are required.', 'error');
 return false;
 }
 }
 if (currentStep === 4) {
 if (!formData.capacity || formData.capacity <= 0) {
 showToast('Maximum members capacity must be a positive number.', 'error');
 return false;
 }
 }
 return true;
 };

 const handleNext = () => {
 if (validateStep()) {
 if (currentStep < totalSteps) {
 setCurrentStep(prev => prev + 1);
 }
 }
 };

 const handleBack = () => {
 if (currentStep > 1) {
 setCurrentStep(prev => prev - 1);
 }
 };

 const handleSubmit = async () => {
 try {
 setLoading(true);

 const addressString = `${formData.address}, ${formData.city}, ${formData.state} ${formData.postalCode}, ${formData.country}`;
 
 const payload = {
 organizationId: orgId,
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
 logoOption: formData.logoOption,
 supportPhone: formData.supportPhone,
 capacity: formData.capacity,
 peakCapacity: formData.peakCapacity,
 operatingHours: formData.operatingHours,
 managerId: formData.managerId,
 services: formData.services,
 amenities: formData.amenities,
 memberPrefix: formData.memberPrefix,
 invoicePrefix: formData.invoicePrefix,
 timezone: formData.timezone,
 currency: formData.currency
 }
 };

 const result = await gymApi.create(payload);
 setCreatedBranchData(result);
 setShowSuccessOverlay(true);
 showToast('Gym Branch registered successfully!', 'success');
 } catch (err: any) {
 console.error(err);
 showToast(handleApiError(err) || 'Failed to register gym branch.', 'error');
 } finally {
 setLoading(false);
 }
 };

 const selectedManager = employees.find(e => e.id === formData.managerId);

 return (
 <div className="min-h-screen bg-white text-neutral-900 flex flex-col relative overflow-y-auto pb-16">
 
 {/* Toast Notification */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 border ${
 toast.type === 'success' 
 ? 'bg-success-light text-success border-green-200' 
 : 'bg-danger-light text-danger border-red-200'
 }`}>
 {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-success" /> : <AlertTriangle className="w-5 h-5 text-danger" />}
 <span className="text-sm font-medium">{toast.message}</span>
 </div>
 )}

 {/* HEADER SECTION */}
 <div className="border-b border-neutral-200/80 bg-neutral-50/40 backdrop-blur-md px-8 py-6 flex items-center justify-between">
 <div>
 <div className="flex items-center gap-2 text-xs text-danger font-semibold uppercase tracking-wider mb-1">
 <Building2 className="w-3.5 h-3.5" />
 <span>{orgName}</span>
 <span className="text-neutral-400">•</span>
 <span>Gym Management</span>
 </div>
 <h1 className="text-2xl font-bold text-neutral-900 font-display">Create Gym Branch</h1>
 <p className="text-sm text-neutral-600 mt-1">Configure operational rules, capacity thresholds, hours, and managers.</p>
 </div>

 {/* Status Slots Warning Banner */}
 {existingGymsCount >= 3 && (
 <div className="flex items-center gap-3 bg-warning-light border border-amber-200 text-amber-700 px-4 py-2.5 rounded-2xl max-w-sm">
 <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
 <div className="text-xs">
 <span className="font-semibold block">Subscription Alert</span>
 Using {existingGymsCount}/5 branches slots. One slot will be consumed.
 </div>
 </div>
 )}
 </div>

 {/* STEP INDICATOR BAR */}
 <div className="px-8 mt-6">
 <div className="bg-neutral-50/60 border border-neutral-200/60 rounded-2xl p-4">
 <div className="flex items-center justify-between text-xs text-neutral-600 mb-2 font-mono">
 <span>Progress Indicator</span>
 <span>Step {currentStep} of {totalSteps}: {
 currentStep === 1 ? 'Identity' :
 currentStep === 2 ? 'Contact Details' :
 currentStep === 3 ? 'Map Coordinates' :
 currentStep === 4 ? 'Capacity & Hours' :
 currentStep === 5 ? 'Branch Manager' :
 currentStep === 6 ? 'Services' :
 currentStep === 7 ? 'Defaults' : 'Review'
 }</span>
 </div>
 {/* Progress Bar */}
 <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
 <div 
 className="h-full bg-primary transition-all duration-300"
 style={{ width: `${(currentStep / totalSteps) * 100}%` }}
 />
 </div>

 {/* Quick Step Nav Row */}
 <div className="grid grid-cols-8 gap-1 mt-3 text-[10px] text-center font-medium font-mono text-neutral-500">
 {Array.from({ length: totalSteps }).map((_, idx) => {
 const stepNum = idx + 1;
 const isPast = stepNum < currentStep;
 const isCurrent = stepNum === currentStep;
 return (
 <div 
 key={stepNum} 
 className={`py-1 rounded-md transition-colors ${
 isCurrent ? 'text-danger bg-danger-light border border-red-200' : 
 isPast ? 'text-success' : 'text-neutral-400'
 }`}
 >
 Step {stepNum}
 </div>
 );
 })}
 </div>
 </div>
 </div>

 {/* MAIN FORM CARD */}
 <div className="flex-1 max-w-4xl w-full mx-auto px-8 mt-6">
 <div className="bg-neutral-50/40 border border-neutral-200/80 rounded-3xl p-8 backdrop-blur-md shadow-2xl relative">
 
 {/* STEP 1: IDENTITY */}
 {currentStep === 1 && (
 <div className="space-y-6">
 <div>
 <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
 <span className="flex items-center justify-center w-6 h-6 rounded-full bg-danger-light text-danger text-xs font-mono">1</span>
 Branch Information & Identity
 </h2>
 <p className="text-xs text-neutral-600 mt-1">Specify your gym's official name, unique tracking code, and public description.</p>
 </div>

 <div className="grid grid-cols-3 gap-6">
 <div className="col-span-2 space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Branch Name <span className="text-danger">*</span></label>
 <input
 type="text"
 placeholder="e.g. Technopark Wellness Hub"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-red-200 focus:ring-1 focus:ring-red-200"
 value={formData.name}
 onChange={e => setFormData({ ...formData, name: e.target.value })}
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Location Code <span className="text-danger">*</span></label>
 <input
 type="text"
 placeholder="e.g. TP-01"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-red-200 focus:ring-1 focus:ring-red-200 font-mono uppercase"
 value={formData.code}
 onChange={e => setFormData({ ...formData, code: e.target.value })}
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Location Description (Optional)</label>
 <textarea
 rows={3}
 placeholder="Provide a short description detailing location access details, orientation, or marketing slogans..."
 className="w-full bg-white border border-neutral-200 rounded-xl p-4 text-sm text-neutral-900 focus:outline-none focus:border-red-200 focus:ring-1 focus:ring-red-200"
 value={formData.description}
 onChange={e => setFormData({ ...formData, description: e.target.value })}
 />
 </div>

 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Branch Type</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-red-200 focus:ring-1 focus:ring-red-200"
 value={formData.type}
 onChange={e => setFormData({ ...formData, type: e.target.value })}
 >
 <option>Standard Club</option>
 <option>Premium Arena</option>
 <option>Yoga Studio / Wellness Hub</option>
 <option>Express / 24-7 Hub</option>
 <option>CrossFit Box</option>
 </select>
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Brand Accent & Logo Theme</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-red-200 focus:ring-1 focus:ring-red-200"
 value={formData.logoOption}
 onChange={e => setFormData({ ...formData, logoOption: e.target.value })}
 >
 <option value="preset-orange">Warm Orange Accent</option>
 <option value="preset-rose">Rose Red Accent</option>
 <option value="preset-violet">Violet Cyber Accent</option>
 <option value="preset-emerald">Emerald Fitness Accent</option>
 </select>
 </div>
 </div>
 </div>
 )}

 {/* STEP 2: CONTACT & ADDRESS */}
 {currentStep === 2 && (
 <div className="space-y-6">
 <div>
 <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
 <span className="flex items-center justify-center w-6 h-6 rounded-full bg-danger-light text-danger text-xs font-mono">2</span>
 Contact Information & Location Address
 </h2>
 <p className="text-xs text-neutral-600 mt-1">Specify how members can contact this branch directly and where it is physically located.</p>
 </div>

 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Contact Phone <span className="text-danger">*</span></label>
 <div className="relative">
 <Phone className="w-4 h-4 text-neutral-500 absolute left-4 top-3.5" />
 <input
 type="tel"
 placeholder="+1 (555) 000-0000"
 className="w-full bg-white border border-neutral-200 rounded-xl pl-12 pr-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-red-200 focus:ring-1 focus:ring-red-200"
 value={formData.phone}
 onChange={e => setFormData({ ...formData, phone: e.target.value })}
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Contact Email</label>
 <div className="relative">
 <Mail className="w-4 h-4 text-neutral-500 absolute left-4 top-3.5" />
 <input
 type="email"
 placeholder="branch@gymflow.com"
 className="w-full bg-white border border-neutral-200 rounded-xl pl-12 pr-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-red-200 focus:ring-1 focus:ring-red-200"
 value={formData.email}
 onChange={e => setFormData({ ...formData, email: e.target.value })}
 />
 </div>
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Street Address <span className="text-danger">*</span></label>
 <div className="relative">
 <MapPin className="w-4 h-4 text-neutral-500 absolute left-4 top-3.5" />
 <input
 type="text"
 placeholder="123 Wellness Way, Suite 400"
 className="w-full bg-white border border-neutral-200 rounded-xl pl-12 pr-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-red-200 focus:ring-1 focus:ring-red-200"
 value={formData.address}
 onChange={e => setFormData({ ...formData, address: e.target.value })}
 />
 </div>
 </div>

 <div className="grid grid-cols-4 gap-4">
 <div className="col-span-2 space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">City <span className="text-danger">*</span></label>
 <input
 type="text"
 placeholder="San Francisco"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-red-200"
 value={formData.city}
 onChange={e => setFormData({ ...formData, city: e.target.value })}
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">State/Province <span className="text-danger">*</span></label>
 <input
 type="text"
 placeholder="CA"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-red-200"
 value={formData.state}
 onChange={e => setFormData({ ...formData, state: e.target.value })}
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Zip/Postal <span className="text-danger">*</span></label>
 <input
 type="text"
 placeholder="94107"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-red-200"
 value={formData.postalCode}
 onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
 />
 </div>
 </div>
 </div>
 )}

 {/* STEP 3: MAP LOCATION */}
 {currentStep === 3 && (
 <div className="space-y-6">
 <div>
 <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
 <span className="flex items-center justify-center w-6 h-6 rounded-full bg-danger-light text-danger text-xs font-mono">3</span>
 Coordinates & Map Geolocation
 </h2>
 <p className="text-xs text-neutral-600 mt-1">Provide exact coordinates for mobile app GPS routing and check-in radius validations.</p>
 </div>

 <div className="grid grid-cols-2 gap-6 bg-neutral-50/40 p-5 rounded-2xl border border-neutral-200/80">
 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Latitude</label>
 <input
 type="number"
 step="0.000001"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none font-mono"
 value={formData.latitude}
 onChange={e => setFormData({ ...formData, latitude: Number(e.target.value) })}
 />
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Longitude</label>
 <input
 type="number"
 step="0.000001"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none font-mono"
 value={formData.longitude}
 onChange={e => setFormData({ ...formData, longitude: Number(e.target.value) })}
 />
 </div>
 </div>

 {/* Simulated Map Display */}
 <div className="h-48 w-full rounded-2xl border border-neutral-200/80 bg-neutral-50/60 relative overflow-hidden flex flex-col items-center justify-center">
 <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#334155 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }}></div>
 <MapPin className="w-10 h-10 text-danger animate-bounce mb-2" />
 <span className="text-xs text-neutral-700 font-semibold">Technopark Branch Location Coordinates Set</span>
 <span className="text-[10px] text-neutral-500 font-mono mt-1">Radius check-in lock set to 100 meters</span>

 <button 
 type="button" 
 onClick={() => {
 setFormData(prev => ({ ...prev, latitude: 37.7749, longitude: -122.4194 }));
 showToast('Coordinates reset to organization default HQ!', 'success');
 }}
 className="absolute bottom-4 right-4 bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 px-3 py-1.5 rounded-lg transition"
 >
 Fetch HQ Location
 </button>
 </div>
 </div>
 )}

 {/* STEP 4: OPERATING HOURS & CAPACITY */}
 {currentStep === 4 && (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
 <span className="flex items-center justify-center w-6 h-6 rounded-full bg-danger-light text-danger text-xs font-mono">4</span>
 Operating Hours & Member Capacity
 </h2>
 <p className="text-xs text-neutral-600 mt-1">Configure weekly hours and limit absolute maximum occupancy metrics.</p>
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

 {/* Hours Grid */}
 <div className="space-y-2 bg-white border border-neutral-200 p-4 rounded-2xl max-h-72 overflow-y-auto">
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

 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Max Member Capacity</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.capacity}
 onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
 />
 <p className="text-[10px] text-neutral-500">Limits concurrent check-ins and schedules for standard class hours.</p>
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Peak Threshold Limit</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none"
 value={formData.peakCapacity}
 onChange={e => setFormData({ ...formData, peakCapacity: Number(e.target.value) })}
 />
 <p className="text-[10px] text-neutral-500">Flags system dashboards if occupancy reaches this concurrent target.</p>
 </div>
 </div>
 </div>
 )}

 {/* STEP 5: MANAGER ASSIGNMENT */}
 {currentStep === 5 && (
 <div className="space-y-6">
 <div>
 <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
 <span className="flex items-center justify-center w-6 h-6 rounded-full bg-danger-light text-danger text-xs font-mono">5</span>
 Branch Manager Assignment
 </h2>
 <p className="text-xs text-neutral-600 mt-1">Assign an employee to govern operations, staff shifts, and local membership approvals.</p>
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Choose Manager</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-red-200"
 value={formData.managerId}
 onChange={e => setFormData({ ...formData, managerId: e.target.value })}
 >
 <option value="">-- No Manager Assigned Yet --</option>
 {employees.map(emp => (
 <option key={emp.id} value={emp.id}>{emp.name} ({emp.role || 'Staff'})</option>
 ))}
 </select>
 </div>

 {selectedManager ? (
 <div className="bg-danger-light border border-red-200 p-5 rounded-2xl flex items-start gap-4">
 <Briefcase className="w-6 h-6 text-danger shrink-0 mt-0.5" />
 <div>
 <span className="text-sm font-bold text-neutral-900 block">{selectedManager.name}</span>
 <span className="text-xs text-neutral-600 block mt-0.5">Email: {selectedManager.email || 'N/A'}</span>
 <span className="text-xs text-danger block mt-1 font-medium">This user will automatically receive Branch Manager permissions for this gym.</span>
 </div>
 </div>
 ) : (
 <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-2xl flex items-center gap-3 text-xs text-neutral-600">
 <Info className="w-4 h-4 text-neutral-500 shrink-0" />
 You can proceed without a manager. You may assign or update the manager later in the staff details panel.
 </div>
 )}
 </div>
 )}

 {/* STEP 6: SERVICES & FACILITIES */}
 {currentStep === 6 && (
 <div className="space-y-6">
 <div>
 <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
 <span className="flex items-center justify-center w-6 h-6 rounded-full bg-danger-light text-danger text-xs font-mono">6</span>
 Services & Facilities Checklist
 </h2>
 <p className="text-xs text-neutral-600 mt-1">Enable services and amenities to display on the client portal and booking apps.</p>
 </div>

 <div className="space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600">Offered Services</h3>
 <div className="grid grid-cols-2 gap-4">
 {availableServices.map(svc => {
 const active = formData.services.includes(svc.id);
 return (
 <div 
 key={svc.id}
 onClick={() => handleCheckboxChange('services', svc.id)}
 className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between ${
 active 
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

 <div className="space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600">Amenities & Infrastructure</h3>
 <div className="grid grid-cols-4 gap-3">
 {availableAmenities.map(amenity => {
 const active = formData.amenities.includes(amenity.id);
 return (
 <div 
 key={amenity.id}
 onClick={() => handleCheckboxChange('amenities', amenity.id)}
 className={`px-3 py-2.5 rounded-xl border text-center cursor-pointer transition text-xs font-medium ${
 active 
 ? 'bg-danger-light border-red-200 text-danger' 
 : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-200'
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

 {/* STEP 7: DEFAULT SETTINGS & PREFIXES */}
 {currentStep === 7 && (
 <div className="space-y-6">
 <div>
 <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
 <span className="flex items-center justify-center w-6 h-6 rounded-full bg-danger-light text-danger text-xs font-mono">7</span>
 Default Settings & Serialization Prefixes
 </h2>
 <p className="text-xs text-neutral-600 mt-1">Configure serial code styles and financial currency standards for this branch.</p>
 </div>

 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Member ID Serial Prefix</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none font-mono uppercase"
 value={formData.memberPrefix}
 onChange={e => setFormData({ ...formData, memberPrefix: e.target.value })}
 />
 <p className="text-[10px] text-neutral-500">e.g. member code style: <span className="text-danger font-mono">{formData.memberPrefix}0042</span></p>
 </div>

 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Billing Invoice Prefix</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none font-mono uppercase"
 value={formData.invoicePrefix}
 onChange={e => setFormData({ ...formData, invoicePrefix: e.target.value })}
 />
 <p className="text-[10px] text-neutral-500">e.g. billing invoice code style: <span className="text-danger font-mono">{formData.invoicePrefix}4580</span></p>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-xs text-neutral-700 font-semibold">Local Timezone</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-red-200"
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
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-red-200"
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
 </div>
 )}

 {/* STEP 8: REVIEW & CONFIRM */}
 {currentStep === 8 && (
 <div className="space-y-6">
 <div>
 <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
 <span className="flex items-center justify-center w-6 h-6 rounded-full bg-danger-light text-danger text-xs font-mono">8</span>
 Review Branch Details & Save
 </h2>
 <p className="text-xs text-neutral-600 mt-1">Review all configuration entries carefully before registering this branch.</p>
 </div>

 <div className="grid grid-cols-2 gap-6">
 
 {/* Column 1: Identity & Address */}
 <div className="bg-white border border-neutral-200 p-5 rounded-2xl space-y-4">
 <span className="text-xs font-bold text-danger uppercase tracking-wider block border-b border-neutral-200 pb-2">Branch Information</span>
 <div className="grid grid-cols-3 gap-2 text-xs">
 <span className="text-neutral-500 font-medium col-span-1">Name:</span>
 <span className="text-neutral-800 col-span-2 font-bold">{formData.name}</span>

 <span className="text-neutral-500 font-medium col-span-1">Code:</span>
 <span className="text-neutral-800 font-mono col-span-2 font-bold">{formData.code}</span>

 <span className="text-neutral-500 font-medium col-span-1">Type:</span>
 <span className="text-neutral-800 col-span-2">{formData.type}</span>

 <span className="text-neutral-500 font-medium col-span-1">Address:</span>
 <span className="text-neutral-800 col-span-2 leading-relaxed">{formData.address}, {formData.city}, {formData.state} {formData.postalCode}</span>
 </div>
 </div>

 {/* Column 2: Parameters & Settings */}
 <div className="bg-white border border-neutral-200 p-5 rounded-2xl space-y-4">
 <span className="text-xs font-bold text-danger uppercase tracking-wider block border-b border-neutral-200 pb-2">Operational Configurations</span>
 <div className="grid grid-cols-3 gap-2 text-xs">
 <span className="text-neutral-500 font-medium col-span-1">Capacity:</span>
 <span className="text-neutral-800 col-span-2">{formData.capacity} concurrent members</span>

 <span className="text-neutral-500 font-medium col-span-1">Manager:</span>
 <span className="text-neutral-800 col-span-2 font-bold">{selectedManager ? selectedManager.name : 'None assigned'}</span>

 <span className="text-neutral-500 font-medium col-span-1">Timezone:</span>
 <span className="text-neutral-800 font-mono col-span-2">{formData.timezone}</span>

 <span className="text-neutral-500 font-medium col-span-1">Prefixes:</span>
 <span className="text-neutral-800 col-span-2 font-mono">{formData.memberPrefix} / {formData.invoicePrefix}</span>
 </div>
 </div>
 </div>

 {/* Lists summary (Services & Amenities) */}
 <div className="bg-white border border-neutral-200 p-5 rounded-2xl space-y-3">
 <span className="text-xs font-bold text-danger uppercase tracking-wider block border-b border-neutral-200 pb-2">Enabled Amenities & Services</span>
 
 <div className="space-y-2">
 <div className="flex flex-wrap gap-1.5">
 {formData.services.map(svc => {
 const matched = availableServices.find(s => s.id === svc);
 return (
 <span key={svc} className="text-[10px] bg-danger-light text-danger px-2 py-1 rounded-lg border border-red-200">
 {matched ? matched.label : svc}
 </span>
 );
 })}
 {formData.services.length === 0 && <span className="text-xs text-neutral-500 italic">No custom services enabled</span>}
 </div>

 <div className="flex flex-wrap gap-1.5 mt-2">
 {formData.amenities.map(amenity => {
 const matched = availableAmenities.find(a => a.id === amenity);
 return (
 <span key={amenity} className="text-[10px] bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-lg border border-neutral-200">
 {matched ? matched.label : amenity}
 </span>
 );
 })}
 {formData.amenities.length === 0 && <span className="text-xs text-neutral-500 italic">No amenities chosen</span>}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ACTION NAVIGATION FOOTER */}
 <div className="mt-8 pt-6 border-t border-neutral-200/80 flex items-center justify-between">
 <button
 type="button"
 onClick={handleBack}
 disabled={currentStep === 1 || loading}
 className={`px-5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
 currentStep === 1
 ? 'border-neutral-200/60 text-neutral-400 cursor-not-allowed'
 : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
 }`}
 >
 <ChevronLeft className="w-4 h-4" />
 Previous Step
 </button>

 {currentStep < totalSteps ? (
 <button
 type="button"
 onClick={handleNext}
 className="px-6 py-2.5 rounded-xl bg-primary text-neutral-900 text-xs font-semibold hover:bg-primary-hover shadow-lg flex items-center gap-1.5 transition"
 >
 Continue Setup
 <ChevronRight className="w-4 h-4" />
 </button>
 ) : (
 <button
 type="button"
 onClick={handleSubmit}
 disabled={loading}
 className="px-6 py-2.5 rounded-xl bg-success hover:bg-green-600 text-white text-xs font-semibold shadow-lg flex items-center gap-1.5 disabled:opacity-50 transition"
 >
 {loading ? 'Creating Branch...' : 'Register Gym Branch'}
 <Check className="w-4 h-4" />
 </button>
 )}
 </div>

 </div>
 </div>

 {/* SUCCESS OVERLAY OVERLAY */}
 {showSuccessOverlay && (
 <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
 <div className="max-w-md w-full bg-neutral-50 border border-neutral-200 p-8 rounded-3xl text-center space-y-6 shadow-2xl relative">
 
 {/* Background Accent Glow */}
 <div className="absolute inset-0 bg-success-light rounded-3xl pointer-events-none" />

 <div className="w-16 h-16 bg-success-light border border-green-200 rounded-full flex items-center justify-center mx-auto text-success">
 <CheckCircle className="w-8 h-8" />
 </div>

 <div className="space-y-2 relative">
 <span className="text-[10px] bg-success-light text-success border border-green-200 px-2.5 py-1 rounded-full font-mono font-bold uppercase tracking-wider inline-block">
 Registered Successfully
 </span>
 <h3 className="text-xl font-bold text-neutral-900 font-display mt-2">{formData.name}</h3>
 <p className="text-xs text-neutral-600 leading-relaxed max-w-xs mx-auto">
 Branch location codes, operating hours, capacity limits, and prefix standards have been pushed successfully to the database.
 </p>
 </div>

 {/* Parameters Block */}
 <div className="bg-white border border-neutral-200/80 p-4 rounded-2xl text-left space-y-2 text-xs relative">
 <div className="flex justify-between">
 <span className="text-neutral-500">Unique Code:</span>
 <span className="font-mono text-danger font-bold uppercase">{formData.code}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Max Capacity:</span>
 <span className="text-neutral-800">{formData.capacity} concurrent members</span>
 </div>
 <div className="flex justify-between">
 <span className="text-neutral-500">Timezone Standard:</span>
 <span className="text-neutral-800">{formData.timezone}</span>
 </div>
 {selectedManager && (
 <div className="flex justify-between border-t border-neutral-200/60 pt-2 mt-1">
 <span className="text-neutral-500">Manager:</span>
 <span className="text-neutral-800 font-bold">{selectedManager.name}</span>
 </div>
 )}
 </div>

 {/* Action buttons */}
 <div className="pt-2 flex flex-col gap-2 relative">
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
 onClick={() => {
 setShowSuccessOverlay(false);
 setCurrentStep(1);
 setFormData(prev => ({
 ...prev,
 name: '',
 code: '',
 description: '',
 phone: '',
 email: '',
 address: '',
 city: '',
 state: '',
 postalCode: ''
 }));
 }}
 className="w-full py-3 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 text-xs font-semibold rounded-xl transition"
 >
 Create Another Branch
 </button>
 </div>
 </div>
 </div>
 )}

 </div>
 );
}
