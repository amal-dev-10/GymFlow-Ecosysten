'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { orgUsersApi, authApi } from '../../lib/api';
import { handleApiError } from '../../lib/api/client';
import {
 Sparkles,
 Phone,
 ArrowRight,
 ShieldCheck,
 RefreshCw,
 Building2,
 Lock,
 MapPin,
 CheckCircle,
 HelpCircle,
 XCircle,
 AlertCircle
} from 'lucide-react';

function AcceptInviteContent() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const token = searchParams.get('token');

 // Loading & Error states
 const [loading, setLoading] = useState(true);
 const [submitting, setSubmitting] = useState(false);
 const [errorMsg, setErrorMsg] = useState('');

 // Invitation detail state
 const [inviteDetails, setInviteDetails] = useState<any | null>(null);

 // Acceptance Flows states
 const [isLoggedIn, setIsLoggedIn] = useState(false);
 const [currentUser, setCurrentUser] = useState<any | null>(null);
 const [flowState, setFlowState] = useState<'details' | 'otp' | 'profile' | 'declined' | 'success'>('details');

 // New User Onboarding states
 const [otp, setOtp] = useState(['', '', '', '', '', '']);
 const [fullName, setFullName] = useState('');
 const [countdown, setCountdown] = useState(59);

 // Fetch Invitation details
 useEffect(() => {
 if (!token) {
 setErrorMsg('Invalid or missing invitation token.');
 setLoading(false);
 return;
 }

 setLoading(true);
 orgUsersApi.getInvitationDetails(token)
 .then((data) => {
 setInviteDetails(data);
 if (data.status !== 'Pending') {
 setErrorMsg(`This invitation has already been ${data.status.toLowerCase()}.`);
 }
 })
 .catch((err) => {
 setErrorMsg('Failed to load invitation details. The invitation link may be invalid or expired.');
 })
 .finally(() => {
 setLoading(false);
 });

 // Check if user is logged in
 const savedToken = localStorage.getItem('token');
 const savedUser = localStorage.getItem('user');
 if (savedToken && savedUser) {
 setIsLoggedIn(true);
 try {
 setCurrentUser(JSON.parse(savedUser));
 } catch {}
 }
 }, [token]);

 // Countdown timer for OTP
 useEffect(() => {
 if (flowState === 'otp' && countdown > 0) {
 const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
 return () => clearTimeout(timer);
 }
 }, [flowState, countdown]);

 const handleDecline = async () => {
 if (!token) return;
 setSubmitting(true);
 setErrorMsg('');
 try {
 await orgUsersApi.declineInvitation(token);
 setFlowState('declined');
 } catch (err: any) {
 setErrorMsg('Failed to decline invitation.');
 } finally {
 setSubmitting(false);
 }
 };

 // Scenario 1: Accept as Logged In User
 const handleAcceptLoggedIn = async () => {
 if (!token || !currentUser) return;
 setSubmitting(true);
 setErrorMsg('');
 try {
 await orgUsersApi.acceptInvitation(token, {
 userId: currentUser.id,
 phoneNumber: inviteDetails.phoneNumber
 });
 setFlowState('success');
 } catch (err: any) {
 setErrorMsg(handleApiError(err) || 'Failed to accept invitation. Make sure your account phone number matches the invited number.');
 } finally {
 setSubmitting(false);
 }
 };

 // Scenario 2: Start OTP Flow for Guest
 const handleStartOtpFlow = async () => {
 setSubmitting(true);
 setErrorMsg('');
 try {
 await authApi.sendOtp(inviteDetails.phoneNumber, 'signup');
 setFlowState('otp');
 setCountdown(59);
 } catch (err: any) {
 setErrorMsg(handleApiError(err) || 'Failed to dispatch verification code.');
 } finally {
 setSubmitting(false);
 }
 };

 // OTP Inputs handling
 const handleOtpChange = (value: string, index: number) => {
 if (isNaN(Number(value))) return;
 const newOtp = [...otp];
 newOtp[index] = value.substring(value.length - 1);
 setOtp(newOtp);
 if (value && index < 5) {
 const nextInput = document.getElementById(`otp-${index + 1}`);
 nextInput?.focus();
 }
 };

 const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
 if (e.key === 'Backspace' && !otp[index] && index > 0) {
 const prevInput = document.getElementById(`otp-${index - 1}`);
 prevInput?.focus();
 }
 };

 // Verify OTP and proceed to profile setup
 const handleVerifyOtp = async (e: React.FormEvent) => {
 e.preventDefault();
 const otpCode = otp.join('');
 if (otpCode.length < 6) return;
 setSubmitting(true);
 setErrorMsg('');
 try {
 // Temporarily store OTP and progress to Profile name entry
 setFlowState('profile');
 } catch (err: any) {
 setErrorMsg('Verification code invalid.');
 } finally {
 setSubmitting(false);
 }
 };

 // Submit complete onboarding signup & accept invite
 const handleCompleteProfileAndAccept = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!fullName.trim()) return;
 setSubmitting(true);
 setErrorMsg('');
 const otpCode = otp.join('');

 try {
 // Verify OTP and register user
 const authData = await authApi.verifyOtp(
 inviteDetails.phoneNumber,
 otpCode,
 fullName,
 'signup'
 );

 // Store credentials
 localStorage.setItem('token', authData.accessToken);
 localStorage.setItem('refreshToken', authData.refreshToken);
 localStorage.setItem('user', JSON.stringify(authData.user));

 // Accept invitation immediately
 await orgUsersApi.acceptInvitation(token!, {
 userId: authData.user.id,
 phoneNumber: inviteDetails.phoneNumber
 });

 setFlowState('success');
 } catch (err: any) {
 setErrorMsg(handleApiError(err) || 'Failed to complete registration onboarding.');
 } finally {
 setSubmitting(false);
 }
 };

 if (loading) {
 return (
 <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col items-center justify-center py-20">
 <RefreshCw className="animate-spin text-primary mb-4" size={32} />
 <span className="text-xs text-neutral-600">Loading invitation details...</span>
 </div>
 );
 }

 return (
 <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-3xl p-8 shadow-2xl relative z-10">
 {/* Brand Header */}
 <div className="flex flex-col items-center gap-3 text-center mb-6">
 <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-2xl shadow-lg select-none">
 GF
 </div>
 <h2 className="font-extrabold text-2xl tracking-tight text-neutral-900 mt-1">
 Gym<span className="text-primary">Flow</span>
 </h2>
 </div>

 {errorMsg && flowState !== 'success' && flowState !== 'declined' && (
 <div className="mb-6 p-4 rounded-xl bg-danger-light border border-red-200 text-danger text-xs text-center font-bold flex items-center gap-2">
 <AlertCircle className="shrink-0" size={14} />
 <span>{errorMsg}</span>
 </div>
 )}

 {/* FLOW STATE: DETAILS / INITIAL SCREEN */}
 {flowState === 'details' && inviteDetails && (
 <div className="space-y-6">
 <div className="text-center space-y-1.5">
 <span className="text-[10px] font-bold text-primary bg-primary-light border border-primary/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
 Workspace Invitation
 </span>
 <h3 className="font-extrabold text-neutral-900 text-base">You've been invited!</h3>
 <p className="text-xs text-neutral-600">
 <span className="text-neutral-900 font-bold">{inviteDetails.invitedBy}</span> has invited you to join <span className="text-neutral-900 font-bold">{inviteDetails.organization.name}</span>.
 </p>
 </div>

 {/* Invitation Meta Card */}
 <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4.5 space-y-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
 {inviteDetails.organization.name.substring(0, 2).toUpperCase()}
 </div>
 <div>
 <span className="block text-xs font-black text-neutral-800">{inviteDetails.organization.name}</span>
 <span className="block text-[10px] text-neutral-500 mt-0.5">Multi-branch fitness network</span>
 </div>
 </div>

 <div className="border-t border-neutral-100 pt-3.5 space-y-2.5">
 <div className="flex justify-between items-center text-xs">
 <span className="text-neutral-500">Invited Role:</span>
 <span className="font-extrabold text-primary flex items-center gap-1">
 <Lock size={11} />
 <span>{inviteDetails.role.name}</span>
 </span>
 </div>
 <div className="flex justify-between items-start text-xs">
 <span className="text-neutral-500 shrink-0">Gym Access:</span>
 <span className="font-bold text-neutral-700 text-right truncate max-w-[180px]">
 {inviteDetails.gymIds === 'all'
 ? 'All Branches'
 : inviteDetails.gymIds.length + ' Specific Branches'}
 </span>
 </div>
 </div>
 </div>

 {/* Accept / Decline actions */}
 <div className="space-y-2.5 pt-4">
 {isLoggedIn ? (
 /* Scenario 1: Logged In */
 <div className="space-y-3">
 <div className="p-3 bg-neutral-50/60 border border-neutral-100 rounded-xl text-[10px] text-neutral-600 text-center">
 Accept invite as logged-in user: <b className="text-neutral-900">{currentUser?.fullName}</b> ({inviteDetails.phoneNumber})
 </div>
 <button
 onClick={handleAcceptLoggedIn}
 disabled={submitting || inviteDetails.status !== 'Pending'}
 className="w-full py-3.5 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-1.5"
 >
 {submitting ? <RefreshCw className="animate-spin" size={13} /> : 'Accept Invitation & Join'}
 </button>
 </div>
 ) : (
 /* Scenario 2: Guest */
 <button
 onClick={handleStartOtpFlow}
 disabled={submitting || inviteDetails.status !== 'Pending'}
 className="w-full py-3.5 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-1.5"
 >
 {submitting ? <RefreshCw className="animate-spin" size={13} /> : 'Verify Phone & Accept Invitation'}
 </button>
 )}

 <button
 onClick={handleDecline}
 disabled={submitting || inviteDetails.status !== 'Pending'}
 className="w-full py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
 >
 Decline Invitation
 </button>
 </div>
 </div>
 )}

 {/* FLOW STATE: DECLINED */}
 {flowState === 'declined' && (
 <div className="text-center space-y-6 py-6 animate-fade-in">
 <div className="w-14 h-14 rounded-full bg-danger-light border border-red-200 flex items-center justify-center text-danger mx-auto">
 <XCircle size={28} />
 </div>
 <div>
 <h3 className="font-extrabold text-neutral-900 text-base">Invitation Declined</h3>
 <p className="text-xs text-neutral-600 mt-1">You have declined the invitation to join the organization workspace.</p>
 </div>
 <button
 onClick={() => router.push('/auth')}
 className="w-full py-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs font-bold text-neutral-700 hover:text-neutral-900 transition-colors cursor-pointer"
 >
 Create New Account
 </button>
 </div>
 )}

 {/* FLOW STATE: OTP FLOW */}
 {flowState === 'otp' && (
 <form onSubmit={handleVerifyOtp} className="space-y-6 animate-fade-in">
 <div className="text-center space-y-1">
 <h3 className="font-black text-neutral-900 text-base">Verify Phone Number</h3>
 <p className="text-xs text-neutral-600">We sent a 6-digit OTP code to verify your phone number</p>
 <p className="text-xs font-bold text-neutral-800 mt-1">{inviteDetails?.phoneNumber}</p>
 </div>

 <div className="flex justify-between gap-2">
 {otp.map((digit, idx) => (
 <input
 key={idx}
 id={`otp-${idx}`}
 type="text"
 maxLength={1}
 value={digit}
 onChange={(e) => handleOtpChange(e.target.value, idx)}
 onKeyDown={(e) => handleOtpKeyDown(e, idx)}
 className="w-12 h-12 bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl text-center text-sm font-black text-neutral-900 outline-none transition-all"
 />
 ))}
 </div>

 <button
 type="submit"
 disabled={submitting || otp.join('').length < 6}
 className="w-full py-3.5 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
 >
 {submitting ? <RefreshCw className="animate-spin" size={13} /> : 'Verify Code & Set Profile'}
 </button>

 <div className="text-center text-xs">
 <span className="text-neutral-500">Didn't receive code? </span>
 {countdown > 0 ? (
 <span className="text-neutral-600 font-medium">Resend in {countdown}s</span>
 ) : (
 <button
 type="button"
 onClick={handleStartOtpFlow}
 className="text-primary hover:text-primary font-bold transition-colors cursor-pointer"
 >
 Resend Code
 </button>
 )}
 </div>
 </form>
 )}

 {/* FLOW STATE: PROFILE SETUP */}
 {flowState === 'profile' && (
 <form onSubmit={handleCompleteProfileAndAccept} className="space-y-6 animate-fade-in">
 <div className="text-center space-y-1">
 <h3 className="font-black text-neutral-900 text-base">Complete Your Profile</h3>
 <p className="text-xs text-neutral-600">Enter your full name to join the organization workspace.</p>
 </div>

 <div className="space-y-1">
 <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Full Name</label>
 <input
 required
 type="text"
 value={fullName}
 onChange={(e) => setFullName(e.target.value)}
 placeholder="Marcus Vance"
 className="w-full bg-neutral-50 border border-neutral-200/80 focus:border-primary/20 rounded-xl p-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 />
 </div>

 <button
 type="submit"
 disabled={submitting || !fullName.trim()}
 className="w-full py-3.5 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
 >
 {submitting ? <RefreshCw className="animate-spin" size={13} /> : 'Complete Setup & Join Organization'}
 </button>
 </form>
 )}

 {/* FLOW STATE: SUCCESS */}
 {flowState === 'success' && (
 <div className="text-center space-y-6 py-6 animate-fade-in">
 <div className="w-14 h-14 rounded-full bg-success-light border border-green-200 flex items-center justify-center text-success mx-auto">
 <CheckCircle size={28} className="animate-pulse" />
 </div>
 <div className="space-y-1.5">
 <h3 className="font-extrabold text-neutral-900 text-base">Successfully Joined!</h3>
 <p className="text-xs text-neutral-600">
 You are now a registered team member of <span className="text-neutral-900 font-bold">{inviteDetails?.organization.name}</span>.
 </p>
 </div>

 <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4 text-left space-y-2.5">
 <div className="text-xs text-neutral-500 flex justify-between">
 <span>Organization:</span>
 <span className="text-neutral-900 font-bold">{inviteDetails?.organization.name}</span>
 </div>
 <div className="text-xs text-neutral-500 flex justify-between">
 <span>Your Role:</span>
 <span className="text-primary font-bold">{inviteDetails?.role.name}</span>
 </div>
 <div className="text-xs text-neutral-500 flex justify-between">
 <span>Gym Access:</span>
 <span className="text-neutral-800 font-bold truncate max-w-[180px]">
 {inviteDetails?.gymIds === 'all' ? 'All Branches' : 'Assigned Branches'}
 </span>
 </div>
 </div>

 <button
 onClick={() => {
 // Update local state and redirect
 if (inviteDetails) {
 localStorage.setItem('organizationId', inviteDetails.organization.id);
 localStorage.setItem('organizationName', inviteDetails.organization.name);
 localStorage.setItem('activeGymName', 'All Gyms');
 }
 router.push(`/workspace/dashboard?orgId=${inviteDetails.organization.id}`);
 }}
 className="w-full py-3.5 bg-primary text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-transform cursor-pointer"
 >
 Go To Workspace
 </button>
 </div>
 )}
 </div>
 );
}

export default function AcceptInvitePage() {
 return (
 <div className="min-h-screen bg-background text-neutral-900 selection:bg-primary selection:text-primary font-sans flex items-center justify-center relative overflow-hidden px-6">
 {/* Background Gradients */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden z-0">
 </div>

 <Suspense fallback={
 <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col items-center justify-center py-20">
 <RefreshCw className="animate-spin text-primary" size={32} />
 </div>
 }>
 <AcceptInviteContent />
 </Suspense>
 </div>
 );
}
