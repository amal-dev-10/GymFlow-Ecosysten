'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, MapPin, Phone, Mail, User, Calendar, CheckCircle, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react';
import { apiClient, handleApiError } from '../../lib/api/client';

function JoinForm() {
 const searchParams = useSearchParams();
 const orgId = searchParams.get('orgId') || '';
 const phoneParam = searchParams.get('phone') || '';

 // Form fields
 const [firstName, setFirstName] = useState('');
 const [lastName, setLastName] = useState('');
 const [email, setEmail] = useState('');
 const [phoneNumber, setPhoneNumber] = useState(phoneParam);
 const [homeGymId, setHomeGymId] = useState('');
 const [dob, setDob] = useState('');
 const [gender, setGender] = useState('');

 // Address info
 const [addressLine1, setAddressLine1] = useState('');
 const [addressLine2, setAddressLine2] = useState('');
 const [city, setCity] = useState('');
 const [stateName, setStateName] = useState('');
 const [postalCode, setPostalCode] = useState('');

 // Emergency contact
 const [emergencyName, setEmergencyName] = useState('');
 const [emergencyPhone, setEmergencyPhone] = useState('');
 const [emergencyRelationship, setEmergencyRelationship] = useState('');

 // Medical / fitness notes
 const [medicalConditions, setMedicalConditions] = useState('');
 const [allergies, setAllergies] = useState('');
 const [fitnessNotes, setFitnessNotes] = useState('');

 // States
 const [branches, setBranches] = useState<any[]>([]);
 const [loading, setLoading] = useState(false);
 const [initialLoading, setInitialLoading] = useState(true);
 const [errorMsg, setErrorMsg] = useState('');
 const [registeredMember, setRegisteredMember] = useState<any>(null);

 // Sync phone param if loaded late
 useEffect(() => {
 if (phoneParam) {
 setPhoneNumber(phoneParam);
 }
 }, [phoneParam]);

 // Fetch gym branches on mount
 useEffect(() => {
 const fetchBranches = async () => {
 if (!orgId) {
 setInitialLoading(false);
 return;
 }
 try {
 const response = await apiClient.get('/v1/public/members/branches', {
 params: { organizationId: orgId }
 });
 setBranches(response.data || []);
 if (response.data && response.data.length > 0) {
 setHomeGymId(response.data[0].id);
 }
 } catch (err) {
 console.error(err);
 setErrorMsg('Failed to load gym locations. Please check the URL or try again later.');
 } finally {
 setInitialLoading(false);
 }
 };

 fetchBranches();
 }, [orgId]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!orgId) {
 setErrorMsg('Missing Organization identifier in link.');
 return;
 }
 if (!homeGymId || !firstName || !lastName || !phoneNumber) {
 setErrorMsg('Please fill in all required fields.');
 return;
 }

 setLoading(true);
 setErrorMsg('');
 try {
 const response = await apiClient.post('/v1/public/members/register', {
 organizationId: orgId,
 homeGymId,
 firstName,
 lastName,
 phoneNumber,
 dob: dob || undefined,
 gender: gender || undefined,
 aiInsights: {
 email,
 addressLine1,
 addressLine2,
 city,
 state: stateName,
 postalCode,
 emergencyName,
 emergencyPhone,
 emergencyRelationship,
 medicalConditions,
 allergies,
 fitnessNotes,
 }
 });

 setRegisteredMember(response.data);
 } catch (err: any) {
 setErrorMsg(handleApiError(err));
 } finally {
 setLoading(false);
 }
 };

 if (!orgId) {
 return (
 <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-3xl p-8 shadow-2xl relative z-10 text-center space-y-4">
 <AlertTriangle className="w-12 h-12 text-danger mx-auto animate-pulse" />
 <h3 className="text-lg font-bold text-neutral-900">Invalid Invite Link</h3>
 <p className="text-xs text-neutral-600 leading-relaxed font-sans">
 This registration link is missing its organization identifier. Please ask the gym staff to resend or scan a valid QR code.
 </p>
 </div>
 );
 }

 if (initialLoading) {
 return (
 <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-3xl p-12 shadow-2xl relative z-10 flex flex-col items-center justify-center gap-4">
 <RefreshCw className="animate-spin text-danger" size={32} />
 <span className="text-xs text-neutral-500 font-mono">Loading enrollment details...</span>
 </div>
 );
 }

 if (registeredMember) {
 return (
 <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-3xl p-8 shadow-2xl relative z-10 text-center space-y-6 animate-scale-in">
 <div className="w-16 h-16 rounded-full bg-success-light border border-green-200 flex items-center justify-center text-success mx-auto">
 <CheckCircle className="w-8 h-8" />
 </div>
 <div>
 <h2 className="text-xl font-bold text-neutral-900">Profile Registered!</h2>
 <p className="text-xs text-neutral-600 mt-2 leading-relaxed font-sans">
 Welcome, <span className="text-neutral-800 font-semibold">{firstName}</span>! Your profile has been successfully generated in the gym registry.
 </p>
 </div>

 <div className="bg-neutral-50/80 border border-neutral-100 rounded-2xl p-5 space-y-3">
 <span className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider block">Your Member ID</span>
 <span className="text-2xl font-black text-danger font-mono tracking-widest block">
 {registeredMember.aiInsights?.memberNumber || 'GF-PENDING'}
 </span>
 <p className="text-[10px] text-neutral-500 leading-normal font-sans pt-2 border-t border-neutral-100/60">
 Please report to the reception desk upon your first visit to select your membership plan, issue your access pass, and start training.
 </p>
 </div>
 </div>
 );
 }

 return (
 <div className="w-full max-w-lg bg-white border border-neutral-200/80 rounded-3xl p-8 shadow-2xl relative z-10">
 {/* Logo / Header */}
 <div className="flex flex-col items-center gap-3 text-center mb-6">
 <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-2xl shadow-lg">
 GF
 </div>
 <h2 className="font-extrabold text-2xl tracking-tight text-neutral-900 mt-1">
 Gym<span className="text-danger">Flow</span> Onboarding
 </h2>
 <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-50 border border-neutral-200 text-[10px] font-bold text-danger font-mono">
 <Sparkles size={10} />
 <span>New Member Enrollment Console</span>
 </div>
 </div>

 {errorMsg && (
 <div className="mb-5 p-3 rounded-lg bg-danger-light border border-red-200 text-danger text-xs text-center font-semibold">
 {errorMsg}
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-4">
 {/* Name Fields */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">First Name *</label>
 <div className="relative">
 <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500"><User size={14} /></span>
 <input
 required
 type="text"
 value={firstName}
 onChange={e => setFirstName(e.target.value)}
 placeholder="John"
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">Last Name *</label>
 <div className="relative">
 <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500"><User size={14} /></span>
 <input
 required
 type="text"
 value={lastName}
 onChange={e => setLastName(e.target.value)}
 placeholder="Doe"
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition"
 />
 </div>
 </div>
 </div>

 {/* Contact info */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">Phone Number *</label>
 <div className="relative">
 <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500"><Phone size={14} /></span>
 <input
 required
 type="tel"
 value={phoneNumber}
 onChange={e => setPhoneNumber(e.target.value)}
 placeholder="+15551234567"
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">Email Address</label>
 <div className="relative">
 <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500"><Mail size={14} /></span>
 <input
 type="email"
 value={email}
 onChange={e => setEmail(e.target.value)}
 placeholder="john.doe@example.com"
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition"
 />
 </div>
 </div>
 </div>

 {/* Home Gym Branch Select */}
 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">Select Gym Location *</label>
 <div className="relative">
 <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500"><MapPin size={14} /></span>
 <select
 value={homeGymId}
 onChange={e => setHomeGymId(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-700 outline-none transition appearance-none cursor-pointer"
 >
 {branches.map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 {branches.length === 0 && <option value="">No active gym branches found</option>}
 </select>
 </div>
 </div>

 {/* Biological Metrics (Optional) */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">Date of Birth</label>
 <div className="relative">
 <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500"><Calendar size={14} /></span>
 <input
 type="date"
 value={dob}
 onChange={e => setDob(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-700 outline-none transition"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">Gender</label>
 <select
 value={gender}
 onChange={e => setGender(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl px-4 py-2.5 text-xs text-neutral-700 outline-none transition appearance-none cursor-pointer"
 >
 <option value="">Select Gender</option>
 <option value="Male">Male</option>
 <option value="Female">Female</option>
 <option value="Other">Other</option>
 </select>
 </div>
 </div>

 {/* Address details */}
 <div className="border-t border-neutral-100/60 pt-4 space-y-3">
 <span className="block text-[10px] font-bold uppercase tracking-wider text-danger font-mono">Address Details</span>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1 sm:col-span-2">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">Street Address</label>
 <input
 type="text"
 value={addressLine1}
 onChange={e => setAddressLine1(e.target.value)}
 placeholder="123 Main St"
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition"
 />
 </div>
 
 <div className="space-y-1 sm:col-span-2">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">Apartment, suite, unit etc.</label>
 <input
 type="text"
 value={addressLine2}
 onChange={e => setAddressLine2(e.target.value)}
 placeholder="Apt 4B"
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition"
 />
 </div>

 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">City</label>
 <input
 type="text"
 value={city}
 onChange={e => setCity(e.target.value)}
 placeholder="San Francisco"
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition"
 />
 </div>

 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">State / Region</label>
 <input
 type="text"
 value={stateName}
 onChange={e => setStateName(e.target.value)}
 placeholder="California"
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition"
 />
 </div>

 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">Postal / Zip Code</label>
 <input
 type="text"
 value={postalCode}
 onChange={e => setPostalCode(e.target.value)}
 placeholder="94103"
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition"
 />
 </div>
 </div>
 </div>

 {/* Emergency contact info */}
 <div className="border-t border-neutral-100/60 pt-4 space-y-3">
 <span className="block text-[10px] font-bold uppercase tracking-wider text-danger font-mono">Emergency Contact Info</span>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">Contact Name</label>
 <input
 type="text"
 value={emergencyName}
 onChange={e => setEmergencyName(e.target.value)}
 placeholder="Jane Doe"
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition"
 />
 </div>

 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">Contact Phone</label>
 <input
 type="tel"
 value={emergencyPhone}
 onChange={e => setEmergencyPhone(e.target.value)}
 placeholder="+15559876543"
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition"
 />
 </div>

 <div className="space-y-1 sm:col-span-2">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">Relationship</label>
 <input
 type="text"
 value={emergencyRelationship}
 onChange={e => setEmergencyRelationship(e.target.value)}
 placeholder="Spouse / Parent / Sibling"
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition"
 />
 </div>
 </div>
 </div>

 {/* Medical & Health Info */}
 <div className="border-t border-neutral-100/60 pt-4 space-y-3">
 <span className="block text-[10px] font-bold uppercase tracking-wider text-danger font-mono">Medical & Health Details</span>
 <div className="space-y-4">
 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">Medical Conditions</label>
 <textarea
 value={medicalConditions}
 onChange={e => setMedicalConditions(e.target.value)}
 placeholder="e.g. Asthma, Hypertension, heart conditions (leave blank if none)"
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition min-h-[60px]"
 />
 </div>

 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">Allergies</label>
 <textarea
 value={allergies}
 onChange={e => setAllergies(e.target.value)}
 placeholder="e.g. Peanut allergy, penicillin, latex (leave blank if none)"
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition min-h-[60px]"
 />
 </div>

 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 font-mono">Additional Health / Fitness Notes</label>
 <textarea
 value={fitnessNotes}
 onChange={e => setFitnessNotes(e.target.value)}
 placeholder="e.g. recovering from knee injury, specific fitness goal notes..."
 className="w-full bg-neutral-50 border border-neutral-200/85 focus:border-red-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition min-h-[60px]"
 />
 </div>
 </div>
 </div>

 <button
 type="submit"
 disabled={loading}
 className="w-full py-4 bg-primary text-xs font-bold text-white rounded-xl shadow-lg active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer mt-4"
 >
 {loading ? (
 <RefreshCw className="animate-spin" size={14} />
 ) : (
 <>
 <span>Join Gym & Register Profile</span>
 <ArrowRight size={14} />
 </>
 )}
 </button>
 </form>
 </div>
 );
}

export default function JoinPage() {
 return (
 <div className="min-h-screen bg-background text-neutral-900 selection:bg-danger selection:text-primary font-sans flex items-center justify-center relative overflow-hidden px-6 py-12">
 {/* Background Gradients */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden z-0">
 </div>

 <Suspense fallback={
 <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-3xl p-12 shadow-2xl relative z-10 flex flex-col items-center justify-center gap-4">
 <RefreshCw className="animate-spin text-danger" size={32} />
 <span className="text-xs text-neutral-500 font-mono">Initializing Join Page...</span>
 </div>
 }>
 <JoinForm />
 </Suspense>
 </div>
 );
}
