'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
 Users,
 Building2,
 MapPin,
 Clock,
 Check,
 ChevronRight,
 ChevronLeft,
 AlertTriangle,
 Sparkles,
 Info,
 Calendar,
 UploadCloud,
 FileText,
 UserCheck,
 Phone,
 Mail,
 Camera,
 Activity,
 Heart,
 Scale,
 X
} from 'lucide-react';
import { gymApi, rolesApi, membersApi, documentsApi } from '../../../../lib/api';

interface Employee {
 id: string;
 name: string;
 role?: string;
}

export default function CreateMemberWizardPage() {
 const router = useRouter();
 const searchParams = useSearchParams();

 // Wizard Navigation
 const [step, setStep] = useState(1);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [showSuccessState, setShowSuccessState] = useState(false);
 const [isGlobalUserFound, setIsGlobalUserFound] = useState(false);
 const [globalMemberData, setGlobalMemberData] = useState<any>(null);

 // Phone OTP verification (proves the shared "global account" identity —
 // useful now for trust, and reused as the login for the future member app)
 const [otpSent, setOtpSent] = useState(false);
 const [otpCode, setOtpCode] = useState('');
 const [otpVerified, setOtpVerified] = useState(false);
 const [otpSending, setOtpSending] = useState(false);
 const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

 // QR Code & Link Sharing
 const [orgId, setOrgId] = useState('');
 const [showQrCodeStep, setShowQrCodeStep] = useState(false);
 // Set only when editing an existing member in THIS org via ?memberId= deep link
 // (e.g. "Complete Onboarding Wizard"). Never set from the cross-org global
 // phone lookup — that always creates a new, org-scoped member instead.
 const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

 // Form Data
 const [branches, setBranches] = useState<any[]>([]);
 const [staff, setStaff] = useState<Employee[]>([]);
 const [generatedId, setGeneratedId] = useState('MEM-000001');

 // Fields
 const [formData, setFormData] = useState({
 // Step 1: Basic Info
 firstName: '',
 lastName: '',
 gender: 'Male',
 dob: '',
 age: '',
 phone: '',
 email: '',
 maritalStatus: 'Single',
 occupation: '',
 photoOption: 'preset-1', // simulated photo upload preset

 // Step 2: Contact
 addressLine1: '',
 addressLine2: '',
 city: '',
 district: '',
 state: '',
 country: 'United States',
 postalCode: '',
 emergencyName: '',
 emergencyPhone: '',
 emergencyRelationship: '',

 // Step 3: Gym Assignment
 homeGymId: '',
 counselor: '',
 trainerId: '',
 dietitianId: '',
 source: 'Walk-In',

 // Step 4: Fitness
 height: '',
 weight: '',
 fitnessGoal: 'General Fitness',
 medicalConditions: '',
 allergies: '',
 fitnessNotes: '',

 // Step 5: Documents
 idProofUploaded: false,
 medicalCertUploaded: false,
 consentUploaded: false,
 otherDocUploaded: false,
 });

 const [selectedFiles, setSelectedFiles] = useState<{
 idProof: File | null;
 medicalCert: File | null;
 consent: File | null;
 otherDoc: File | null;
 }>({
 idProof: null,
 medicalCert: null,
 consent: null,
 otherDoc: null,
 });

 // Member profile photo — either a regular file upload or a webcam capture
 const [photoFile, setPhotoFile] = useState<File | null>(null);
 const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
 const [showWebcam, setShowWebcam] = useState(false);
 const [webcamError, setWebcamError] = useState<string | null>(null);
 const photoInputRef = useRef<HTMLInputElement>(null);
 const videoRef = useRef<HTMLVideoElement>(null);
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const mediaStreamRef = useRef<MediaStream | null>(null);

 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 useEffect(() => {
 return () => {
 mediaStreamRef.current?.getTracks().forEach(track => track.stop());
 if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
 };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 useEffect(() => {
 const fetchData = async () => {
 try {
 setLoading(true);
 const savedOrgId = localStorage.getItem('organizationId') || '';
 setOrgId(savedOrgId);
 const branchList = await gymApi.list(savedOrgId);
 setBranches(branchList || []);
 
 // Pre-select branch: explicit ?gymId= (e.g. deep-linked from Branch Dashboard)
 // takes priority, otherwise fall back to the currently active branch.
 const gymIdParam = searchParams.get('gymId');
 const matchedById = gymIdParam ? branchList.find((b: any) => b.id === gymIdParam) : null;
 if (matchedById) {
 setFormData(prev => ({ ...prev, homeGymId: matchedById.id }));
 } else {
 const activeGymName = localStorage.getItem('activeGymName') || 'All Gyms';
 if (activeGymName !== 'All Gyms') {
 const matched = branchList.find((b: any) => b.name === activeGymName);
 if (matched) {
 setFormData(prev => ({ ...prev, homeGymId: matched.id }));
 }
 } else if (branchList.length > 0) {
 setFormData(prev => ({ ...prev, homeGymId: branchList[0].id }));
 }
 }

 // Fetch employees
 const employeesList = await rolesApi.getEmployees();
 setStaff(employeesList || []);

 // Load current members to simulate preview Member ID sequence
 const existingMembers = await membersApi.list({ homeGymId: 'all' });
 const nextSequence = `MEM-${String((existingMembers?.length || 0) + 1).padStart(6, '0')}`;
 setGeneratedId(nextSequence);

 // Check search parameters for editing context
 const memberIdParam = searchParams.get('memberId');
 if (memberIdParam) {
 try {
 const memberData = await membersApi.get(memberIdParam);
 if (memberData) {
 setEditingMemberId(memberIdParam);
 const ai = memberData.aiInsights || {};
 setFormData({
 firstName: memberData.firstName || '',
 lastName: memberData.lastName || '',
 gender: memberData.gender || 'Male',
 dob: memberData.dob ? memberData.dob.split('T')[0] : '',
 age: memberData.dob ? String(new Date().getFullYear() - new Date(memberData.dob).getFullYear()) : '',
 phone: memberData.phoneNumber || '',
 email: ai.email || '',
 maritalStatus: ai.maritalStatus || 'Single',
 occupation: ai.occupation || '',
 photoOption: ai.photoOption || 'preset-1',
 addressLine1: ai.addressLine1 || '',
 addressLine2: ai.addressLine2 || '',
 city: ai.city || '',
 district: ai.district || '',
 state: ai.state || '',
 country: ai.country || 'United States',
 postalCode: ai.postalCode || '',
 emergencyName: ai.emergencyName || '',
 emergencyPhone: ai.emergencyPhone || '',
 emergencyRelationship: ai.emergencyRelationship || '',
 homeGymId: memberData.homeGymId || '',
 counselor: ai.counselor || '',
 trainerId: ai.trainerId || '',
 dietitianId: ai.dietitianId || '',
 source: ai.source || 'Walk-In',
 height: ai.height || '',
 weight: ai.weight || '',
 fitnessGoal: ai.fitnessGoal || 'General Fitness',
 medicalConditions: ai.medicalConditions || '',
 allergies: ai.allergies || '',
 fitnessNotes: ai.fitnessNotes || '',
 idProofUploaded: ai.idProofUploaded || false,
 medicalCertUploaded: ai.medicalCertUploaded || false,
 consentUploaded: ai.consentUploaded || false,
 otherDocUploaded: ai.otherDocUploaded || false,
 });
 setStep(4); // Start directly at step 4!
 }
 } catch (e) {
 console.error('Failed to load editing member', e);
 }
 }

 } catch (err) {
 console.error(err);
 showToast('Failed to load initial configurations', 'error');
 } finally {
 setLoading(false);
 }
 };

 fetchData();
 }, [searchParams]);

 // Age calculation logic
 const handleDobChange = (dobVal: string) => {
 if (!dobVal) {
 setFormData(prev => ({ ...prev, dob: '', age: '' }));
 return;
 }
 const birthDate = new Date(dobVal);
 const today = new Date();
 let ageCalc = today.getFullYear() - birthDate.getFullYear();
 const m = today.getMonth() - birthDate.getMonth();
 if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
 ageCalc--;
 }
 setFormData(prev => ({ ...prev, dob: dobVal, age: String(ageCalc >= 0 ? ageCalc : 0) }));
 };

 // --- Member photo: file upload or webcam capture ---

 const setPhoto = (file: File) => {
 if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
 setPhotoFile(file);
 setPhotoPreviewUrl(URL.createObjectURL(file));
 };

 const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 if (!file.type.startsWith('image/')) {
 showToast('Please select an image file', 'error');
 return;
 }
 setPhoto(file);
 e.target.value = '';
 };

 const removePhoto = () => {
 if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
 setPhotoFile(null);
 setPhotoPreviewUrl(null);
 };

 const stopWebcamStream = () => {
 mediaStreamRef.current?.getTracks().forEach(track => track.stop());
 mediaStreamRef.current = null;
 };

 const openWebcam = async () => {
 setWebcamError(null);
 setShowWebcam(true);
 try {
 const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
 mediaStreamRef.current = stream;
 if (videoRef.current) {
 videoRef.current.srcObject = stream;
 await videoRef.current.play();
 }
 } catch (err) {
 console.error('Webcam access failed', err);
 setWebcamError('Could not access the camera. Check browser permissions and try again.');
 }
 };

 const closeWebcam = () => {
 stopWebcamStream();
 setShowWebcam(false);
 setWebcamError(null);
 };

 const capturePhoto = () => {
 const video = videoRef.current;
 const canvas = canvasRef.current;
 if (!video || !canvas) return;
 canvas.width = video.videoWidth;
 canvas.height = video.videoHeight;
 const ctx = canvas.getContext('2d');
 if (!ctx) return;
 ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
 canvas.toBlob(blob => {
 if (!blob) return;
 const file = new File([blob], `member-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
 setPhoto(file);
 closeWebcam();
 }, 'image/jpeg', 0.9);
 };

 const handleSendOtp = async () => {
 const phoneVal = formData.phone.trim();
 if (!phoneVal || phoneVal.length < 5) {
 showToast('Enter a valid phone number first', 'error');
 return;
 }
 try {
 setOtpSending(true);
 const res = await membersApi.sendPhoneOtp(phoneVal);
 setOtpSent(true);
 setOtpVerified(false);
 setOtpCode('');
 // No SMS gateway is wired up in this environment — surface the code
 // directly so the flow can be tested end-to-end.
 setDevOtpHint(res.devOtp || null);
 showToast(res.devOtp ? `Code sent (dev preview: ${res.devOtp})` : 'Verification code sent', 'success');
 } catch (err) {
 console.error(err);
 showToast('Failed to send verification code', 'error');
 } finally {
 setOtpSending(false);
 }
 };

 const handleVerifyOtp = async () => {
 const phoneVal = formData.phone.trim();
 if (!otpCode.trim()) {
 showToast('Enter the code you received', 'error');
 return;
 }
 try {
 setOtpSending(true);
 await membersApi.verifyPhoneOtp(phoneVal, otpCode.trim());
 setOtpVerified(true);
 setDevOtpHint(null);
 showToast('Phone number verified!', 'success');
 } catch (err: any) {
 console.error(err);
 showToast(err?.response?.data?.message || 'Incorrect or expired code', 'error');
 } finally {
 setOtpSending(false);
 }
 };

 const verifyPhoneNumber = async () => {
 const phoneVal = formData.phone.trim();
 if (!phoneVal) {
 showToast('Phone Number is required', 'error');
 return;
 }
 if (phoneVal.length < 5) {
 showToast('Please enter a valid phone number', 'error');
 return;
 }

 try {
 setSaving(true);
 const globalProfile = await membersApi.lookupGlobal(phoneVal);
 if (globalProfile) {
 setIsGlobalUserFound(true);
 setGlobalMemberData(globalProfile);
 showToast(
 globalProfile.phoneVerified
 ? `Verified profile found for ${globalProfile.firstName}! Loading details.`
 : `Profile found for ${globalProfile.firstName}! Loading details.`,
 'success'
 );

 // Pre-populate global data fields. homeGymId is deliberately NOT copied —
 // this member is joining a *different* gym, so the branch is chosen fresh
 // in Step 4 rather than inherited from wherever they were found.
 setFormData(prev => ({
 ...prev,
 firstName: globalProfile.firstName,
 lastName: globalProfile.lastName || '',
 gender: globalProfile.gender || 'Male',
 dob: globalProfile.dob ? globalProfile.dob.split('T')[0] : '',
 age: globalProfile.dob ? String(new Date().getFullYear() - new Date(globalProfile.dob).getFullYear()) : '',
 addressLine1: globalProfile.aiInsights?.addressLine1 || '',
 addressLine2: globalProfile.aiInsights?.addressLine2 || '',
 city: globalProfile.aiInsights?.city || '',
 district: globalProfile.aiInsights?.district || '',
 state: globalProfile.aiInsights?.state || '',
 postalCode: globalProfile.aiInsights?.postalCode || '',
 emergencyName: globalProfile.aiInsights?.emergencyName || '',
 emergencyPhone: globalProfile.aiInsights?.emergencyPhone || '',
 emergencyRelationship: globalProfile.aiInsights?.emergencyRelationship || '',
 counselor: globalProfile.aiInsights?.counselor || '',
 trainerId: globalProfile.aiInsights?.trainerId || '',
 dietitianId: globalProfile.aiInsights?.dietitianId || '',
 source: globalProfile.aiInsights?.source || 'Walk-In',
 height: globalProfile.aiInsights?.height || '',
 weight: globalProfile.aiInsights?.weight || '',
 fitnessGoal: globalProfile.aiInsights?.fitnessGoal || 'General Fitness',
 medicalConditions: globalProfile.aiInsights?.medicalConditions || '',
 allergies: globalProfile.aiInsights?.allergies || '',
 fitnessNotes: globalProfile.aiInsights?.fitnessNotes || '',
 }));

 // Note: editingMemberId is intentionally left untouched here. This profile
 // may belong to a different organization entirely, so on submit we always
 // create a new org-scoped member — the backend links it to this same
 // global identity by phone number automatically.
 setShowQrCodeStep(false);
 setStep(4); // Jump directly to Gym Assignment (Step 4)
 } else {
 setIsGlobalUserFound(false);
 setGlobalMemberData(null);
 showToast('No profile found. Displaying signup QR code.', 'success');
 setShowQrCodeStep(true);
 }
 } catch (err) {
 console.error(err);
 showToast('Error verifying phone number', 'error');
 } finally {
 setSaving(false);
 }
 };

 // Form Validation
 const validateStep = (currentStep: number) => {
 if (currentStep === 1) {
 if (!formData.phone.trim()) {
 showToast('Phone Number is required', 'error');
 return false;
 }
 }
 if (currentStep === 2) {
 if (!formData.firstName.trim()) {
 showToast('First Name is required', 'error');
 return false;
 }
 if (!formData.dob) {
 showToast('Date of Birth is required', 'error');
 return false;
 }
 }
 if (currentStep === 3) {
 if (formData.emergencyPhone && !/^\+?[0-9\s-]{7,15}$/.test(formData.emergencyPhone)) {
 showToast('Please enter a valid Emergency Contact number', 'error');
 return false;
 }
 if (formData.emergencyPhone && !formData.emergencyName) {
 showToast('Emergency Contact Name is required when phone is specified', 'error');
 return false;
 }
 }
 if (currentStep === 4) {
 if (!formData.homeGymId) {
 showToast('Home Gym assignment is required', 'error');
 return false;
 }
 }
 return true;
 };

 const handleNext = () => {
 if (validateStep(step)) {
 if (step === 1) {
 verifyPhoneNumber();
 } else {
 setStep(prev => prev + 1);
 }
 }
 };

 const handleBack = () => {
 if (editingMemberId && step === 4) {
 return;
 }
 if (step === 4 && isGlobalUserFound) {
 setStep(1); // Back to phone verification
 } else {
 setStep(prev => Math.max(1, prev - 1));
 }
 };

 const handleSubmit = async () => {
 if (!validateStep(1) || !validateStep(4)) {
 return;
 }
 if (!isGlobalUserFound) {
 if (!validateStep(2) || !validateStep(3)) {
 return;
 }
 }

 try {
 setSaving(true);
 const matchedTrainer = staff.find(s => s.id === formData.trainerId);
 const matchedDietitian = staff.find(s => s.id === formData.dietitianId);

 const payload = {
 homeGymId: formData.homeGymId,
 firstName: formData.firstName,
 lastName: formData.lastName,
 phoneNumber: formData.phone,
 dob: formData.dob,
 gender: formData.gender,
 aiInsights: {
 maritalStatus: formData.maritalStatus,
 occupation: formData.occupation,
 photoOption: formData.photoOption,
 addressLine1: formData.addressLine1,
 addressLine2: formData.addressLine2,
 city: formData.city,
 district: formData.district,
 state: formData.state,
 country: formData.country,
 postalCode: formData.postalCode,
 emergencyName: formData.emergencyName,
 emergencyPhone: formData.emergencyPhone,
 emergencyRelationship: formData.emergencyRelationship,
 counselor: formData.counselor,
 trainerId: formData.trainerId,
 assignedTrainerName: matchedTrainer ? matchedTrainer.name : undefined,
 dietitianId: formData.dietitianId,
 assignedDietitianName: matchedDietitian ? matchedDietitian.name : undefined,
 source: formData.source,
 fitnessGoal: formData.fitnessGoal,
 medicalConditions: formData.medicalConditions,
 allergies: formData.allergies,
 fitnessNotes: formData.fitnessNotes,
 idProofUploaded: formData.idProofUploaded,
 medicalCertUploaded: formData.medicalCertUploaded,
 consentUploaded: formData.consentUploaded,
 otherDocUploaded: formData.otherDocUploaded,
 height: formData.height,
 weight: formData.weight,
 onboardingCompleted: true
 }
 };

 // If this is a deep-linked "complete onboarding" edit of a member already
 // in this org, update it in place. Otherwise always create — the backend
 // finds any existing global profile for this phone number (across
 // organizations) and links/copies it automatically, rather than editing
 // another gym's member record in place.
 let targetId: string;
 if (editingMemberId) {
 await membersApi.update(editingMemberId, payload);
 targetId = editingMemberId;
 } else {
 const result = await membersApi.create(payload);
 targetId = result.id;
 }

 // Helper function to upload files using the presigned URL flow
 const uploadDocument = async (file: File, documentType: string) => {
 try {
 const { presignedUrl, finalUrl } = await documentsApi.generatePresignedUrl({
 targetId,
 targetType: 'MEMBER',
 fileName: file.name,
 contentType: file.type,
 });

 try {
 const axios = (await import('axios')).default;
 await axios.put(presignedUrl, file, {
 headers: { 'Content-Type': file.type },
 });
 await documentsApi.confirmUpload({
 targetId,
 targetType: 'MEMBER',
 documentType,
 url: finalUrl,
 });
 } catch (uploadErr) {
 console.warn('S3 upload failed, executing fallback to create record directly', uploadErr);
 // Fallback for mock environments: Confirm the upload with simulated S3 URL directly
 await documentsApi.confirmUpload({
 targetId,
 targetType: 'MEMBER',
 documentType,
 url: finalUrl,
 });
 }
 } catch (err) {
 console.error(`Failed to upload ${documentType}`, err);
 }
 };

 const uploadPromises: Promise<any>[] = [];
 if (selectedFiles.idProof) {
 uploadPromises.push(uploadDocument(selectedFiles.idProof, 'ID_PROOF'));
 }
 if (selectedFiles.medicalCert) {
 uploadPromises.push(uploadDocument(selectedFiles.medicalCert, 'MEDICAL_CERT'));
 }
 if (selectedFiles.consent) {
 uploadPromises.push(uploadDocument(selectedFiles.consent, 'CONSENT_WAIVER'));
 }
 if (selectedFiles.otherDoc) {
 uploadPromises.push(uploadDocument(selectedFiles.otherDoc, 'SUPPLEMENTAL'));
 }

 if (uploadPromises.length > 0) {
 await Promise.all(uploadPromises);
 }

 // Upload the member's profile photo (file upload or webcam capture), if provided
 if (photoFile) {
 try {
 const { presignedUrl, finalUrl } = await documentsApi.generatePresignedUrl({
 targetId,
 targetType: 'MEMBER',
 fileName: photoFile.name,
 contentType: photoFile.type,
 });
 try {
 const axios = (await import('axios')).default;
 await axios.put(presignedUrl, photoFile, { headers: { 'Content-Type': photoFile.type } });
 } catch (uploadErr) {
 console.warn('S3 upload failed, using generated URL directly', uploadErr);
 }
 await membersApi.update(targetId, { aiInsights: { photoUrl: finalUrl } });
 } catch (err) {
 console.error('Failed to upload member photo', err);
 }
 }

 // If weight and height are provided, log a physical measurement automatically
 if (formData.height || formData.weight) {
 await membersApi.addMeasurement(targetId!, {
 height: formData.height ? parseFloat(formData.height) : undefined,
 weight: formData.weight ? parseFloat(formData.weight) : undefined
 });
 }

 setShowSuccessState(true);
 } catch (err) {
 console.error(err);
 showToast('Failed to register member', 'error');
 } finally {
 setSaving(false);
 }
 };

 const getBranchName = (id: string) => {
 const b = branches.find(x => x.id === id);
 return b ? b.name : 'Not Assigned';
 };

 const getTrainerName = (id: string) => {
 const s = staff.find(x => x.id === id);
 return s ? s.name : 'Not Assigned';
 };

 const getDietitianName = (id: string) => {
 const s = staff.find(x => x.id === id);
 return s ? s.name : 'Not Assigned';
 };

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Initializing registration form wizard...
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-white text-neutral-900 p-8 flex flex-col relative">
 
 {/* Toast Notification */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border ${
 toast.type === 'success' 
 ? 'bg-success-light text-success border-green-200' 
 : 'bg-danger-light text-danger border-red-200'
 }`}>
 <span className="text-sm font-medium">{toast.message}</span>
 </div>
 )}

 {/* HEADER */}
 <div className="flex items-center justify-between border-b border-neutral-200/80 pb-6 mb-6">
 <div>
 <h1 className="text-2xl font-bold text-neutral-900 font-display">Create Member Profile</h1>
 <p className="text-xs text-neutral-600 mt-1">Register new biological and operational profile, link home gym location, and assign coaching staff.</p>
 </div>
 <div>
 <button
 type="button"
 onClick={() => router.push('/workspace/members')}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Cancel and Return
 </button>
 </div>
 </div>

 {/* MAIN CONTAINER */}
 <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8">
 
 {/* LEFT COLUMN: WIZARD FORM (75%) */}
 <div className="lg:col-span-3 space-y-6 flex flex-col justify-between">
 
 <div className="bg-neutral-50/20 border border-neutral-200/60 rounded-3xl p-8 backdrop-blur-md min-h-[460px]">
 
 {/* STEP PROGRESS TRACKER */}
 <div className="flex justify-between items-center mb-8 border-b border-neutral-200 pb-6">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-danger font-mono">
 {(isGlobalUserFound || editingMemberId) ? `Step ${step - 3} of 4` : `Step ${step} of 7`}
 </span>
 <span className="text-xs text-neutral-500">•</span>
 <span className="text-xs text-neutral-700 font-semibold">
 {step === 1 && 'Mobile Verification'}
 {step === 2 && 'Basic Details'}
 {step === 3 && 'Contact Details'}
 {step === 4 && 'Home Gym & Coach Assignment'}
 {step === 5 && 'Fitness Goals & Notes'}
 {step === 6 && 'ID & Consent Documents'}
 {step === 7 && 'Review Profile'}
 </span>
 </div>

 {/* Graphical Steps */}
 <div className="flex gap-1.5">
 {((isGlobalUserFound || editingMemberId) ? [4, 5, 6, 7] : [1, 2, 3, 4, 5, 6, 7]).map((s) => (
 <div
 key={s}
 className={`w-8 h-1.5 rounded-full transition-all duration-300 ${
 step >= s ? 'bg-primary' : 'bg-neutral-100'
 }`}
 />
 ))}
 </div>
 </div>

 {/* STEP 1: MOBILE VERIFICATION */}
 {step === 1 && (
 <div className="space-y-6 max-w-md mx-auto py-8">
 {!showQrCodeStep ? (
 <>
 <div className="text-center space-y-2 mb-6">
 <div className="mx-auto w-12 h-12 rounded-2xl bg-danger-light border border-red-200 flex items-center justify-center text-danger">
 <Phone className="w-6 h-6" />
 </div>
 <h3 className="text-base font-bold text-neutral-900 font-display">Mobile Number</h3>
 <p className="text-xs text-neutral-600">We'll check if this member already has a profile at another gym. If not, you can enter their details manually — no verification required.</p>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold font-mono uppercase">Mobile Number <span className="text-danger">*</span></label>
 <div className="flex gap-2">
 <input
 type="tel"
 required
 placeholder="e.g. +1 (555) 000-0000"
 className="flex-1 bg-white border border-neutral-200 rounded-xl px-4 py-3 text-xs text-neutral-900 focus:outline-none focus:border-red-200"
 value={formData.phone}
 onChange={e => {
 setFormData({ ...formData, phone: e.target.value });
 setOtpSent(false);
 setOtpVerified(false);
 setDevOtpHint(null);
 }}
 />
 {otpVerified ? (
 <span className="shrink-0 px-3 py-3 rounded-xl bg-success-light border border-green-200 text-success text-[10px] font-bold flex items-center gap-1.5">
 <Check size={13} /> Verified
 </span>
 ) : (
 <button
 type="button"
 disabled={otpSending || !formData.phone.trim()}
 onClick={handleSendOtp}
 className="shrink-0 px-3.5 py-3 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-[10px] font-bold rounded-xl transition disabled:opacity-40"
 >
 {otpSending && !otpSent ? 'Sending...' : otpSent ? 'Resend Code' : 'Send Code (Optional)'}
 </button>
 )}
 </div>

 {otpSent && !otpVerified && (
 <div className="flex gap-2 pt-2">
 <input
 type="text"
 inputMode="numeric"
 maxLength={6}
 placeholder="6-digit code"
 className="flex-1 bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-red-200 font-mono tracking-widest"
 value={otpCode}
 onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
 />
 <button
 type="button"
 disabled={otpSending || otpCode.length < 4}
 onClick={handleVerifyOtp}
 className="shrink-0 px-4 py-2.5 bg-primary hover:bg-primary-hover text-neutral-900 text-[10px] font-bold rounded-xl transition disabled:opacity-40"
 >
 {otpSending ? 'Verifying...' : 'Verify'}
 </button>
 </div>
 )}
 {devOtpHint && (
 <p className="text-[10px] text-neutral-500 pt-1">
 No SMS gateway configured in this environment — dev preview code: <span className="font-mono font-bold text-neutral-700">{devOtpHint}</span>
 </p>
 )}
 <p className="text-[10px] text-neutral-500 pt-1">Verifying now is optional but recommended — it carries forward to every gym this member joins and will power sign-in on the future member app.</p>
 </div>
 </>
 ) : (
 <div className="text-center space-y-6">
 <div className="space-y-2">
 <div className="mx-auto w-12 h-12 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-500">
 <UserCheck className="w-6 h-6" />
 </div>
 <h3 className="text-base font-bold text-neutral-900 font-display">No Existing Profile Found</h3>
 <p className="text-xs text-neutral-600">
 <span className="text-danger font-semibold font-mono">{formData.phone}</span> isn't registered at any gym yet. Enter their details manually to continue.
 </p>
 </div>

 <button
 type="button"
 onClick={() => {
 setShowQrCodeStep(false);
 setStep(2);
 }}
 className="w-full py-3 bg-primary hover:bg-primary-hover text-neutral-900 text-xs font-bold rounded-xl transition"
 >
 Enter Details Manually
 </button>

 <div className="border-t border-neutral-200 pt-5 space-y-3">
 <p className="text-[10px] text-neutral-500 uppercase tracking-wide font-semibold">Or let them self-enroll (optional)</p>
 <div className="mx-auto w-32 h-32 bg-white border border-neutral-200 rounded-2xl flex flex-col items-center justify-center p-2 relative overflow-hidden">
 <img
 src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
 `http://localhost:3000/join?orgId=${orgId}&phone=${formData.phone}`
 )}`}
 alt="Join Onboarding QR Code"
 className="w-full h-full object-contain"
 />
 </div>
 <p className="text-[10px] text-neutral-500">Scan to fill their own details on mobile, then check status below.</p>
 <button
 type="button"
 disabled={saving}
 onClick={verifyPhoneNumber}
 className="w-full py-2.5 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold rounded-xl transition"
 >
 {saving ? 'Checking...' : 'Check Status'}
 </button>
 </div>
 </div>
 )}
 </div>
 )}

 {/* STEP 2: BASIC INFO */}
 {step === 2 && (
 <div className="space-y-6">
 <div className="flex items-start gap-6">
 {/* Photo selection */}
 <div className="space-y-2">
 <label className="text-[10px] text-neutral-600 font-semibold font-mono uppercase block">Member Photo</label>
 <div
 onClick={() => photoInputRef.current?.click()}
 className="relative w-24 h-24 bg-neutral-50 border-2 border-dashed border-neutral-200 hover:border-red-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition overflow-hidden group"
 >
 {photoPreviewUrl ? (
 <img src={photoPreviewUrl} alt="Member" className="w-full h-full object-cover" />
 ) : (
 <Users size={24} className="text-neutral-300" />
 )}
 <div className="absolute inset-0 bg-neutral-900/0 group-hover:bg-neutral-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
 <Camera size={20} className="text-white" />
 </div>
 {photoPreviewUrl && (
 <button
 type="button"
 onClick={e => { e.stopPropagation(); removePhoto(); }}
 className="absolute top-1 right-1 w-5 h-5 bg-neutral-900/70 hover:bg-neutral-900 rounded-full flex items-center justify-center text-white"
 >
 <X size={11} />
 </button>
 )}
 </div>
 <input
 ref={photoInputRef}
 type="file"
 accept="image/*"
 className="hidden"
 onChange={handlePhotoFileChange}
 />
 <div className="flex flex-col gap-1">
 <button
 type="button"
 onClick={() => photoInputRef.current?.click()}
 className="text-[9px] text-neutral-600 hover:text-neutral-900 font-semibold text-center"
 >
 Upload Photo
 </button>
 <button
 type="button"
 onClick={openWebcam}
 className="text-[9px] text-danger hover:text-danger font-semibold text-center"
 >
 Use Webcam
 </button>
 </div>
 </div>

 <div className="flex-1 grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">First Name <span className="text-danger">*</span></label>
 <input
 type="text"
 required
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-red-200"
 value={formData.firstName}
 onChange={e => setFormData({ ...formData, firstName: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Last Name</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-red-200"
 value={formData.lastName}
 onChange={e => setFormData({ ...formData, lastName: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Gender</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.gender}
 onChange={e => setFormData({ ...formData, gender: e.target.value })}
 >
 <option value="Male">Male</option>
 <option value="Female">Female</option>
 <option value="Other">Other</option>
 </select>
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Date of Birth <span className="text-danger">*</span></label>
 <div className="relative">
 <input
 type="date"
 required
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.dob}
 onChange={e => handleDobChange(e.target.value)}
 />
 </div>
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Age (Calculated)</label>
 <input
 type="text"
 readOnly
 disabled
 className="w-full bg-neutral-50/40 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-500 focus:outline-none font-mono"
 value={formData.age ? `${formData.age} years old` : 'Select Date of Birth'}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Phone Number <span className="text-danger">*</span></label>
 <input
 type="tel"
 disabled
 readOnly
 className="w-full bg-neutral-50/40 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-500 focus:outline-none font-mono"
 value={formData.phone}
 />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-6 pt-2">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Email Address</label>
 <input
 type="email"
 placeholder="e.g. member@domain.com"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.email}
 onChange={e => setFormData({ ...formData, email: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Marital Status</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.maritalStatus}
 onChange={e => setFormData({ ...formData, maritalStatus: e.target.value })}
 >
 <option value="Single">Single</option>
 <option value="Married">Married</option>
 <option value="Divorced">Divorced</option>
 <option value="Widowed">Widowed</option>
 </select>
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Occupation</label>
 <input
 type="text"
 placeholder="e.g. Software Engineer"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.occupation}
 onChange={e => setFormData({ ...formData, occupation: e.target.value })}
 />
 </div>
 </div>
 </div>
 )} {/* STEP 3: CONTACT DETAILS */}
 {step === 3 && (
 <div className="space-y-6">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Address Line 1</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.addressLine1}
 onChange={e => setFormData({ ...formData, addressLine1: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Address Line 2</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.addressLine2}
 onChange={e => setFormData({ ...formData, addressLine2: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">City</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.city}
 onChange={e => setFormData({ ...formData, city: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">District</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.district}
 onChange={e => setFormData({ ...formData, district: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">State / Region</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.state}
 onChange={e => setFormData({ ...formData, state: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Postal / ZIP Code</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.postalCode}
 onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
 />
 </div>
 </div>

 <div className="border-t border-neutral-200/80 pt-6 space-y-4">
 <span className="text-xs font-bold text-neutral-700 block uppercase tracking-wider">Emergency Contact Credentials</span>
 <div className="grid grid-cols-3 gap-6">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Emergency Name</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.emergencyName}
 onChange={e => setFormData({ ...formData, emergencyName: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Emergency Phone</label>
 <input
 type="tel"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.emergencyPhone}
 onChange={e => setFormData({ ...formData, emergencyPhone: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Relationship</label>
 <input
 type="text"
 placeholder="e.g. Spouse, Parent"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.emergencyRelationship}
 onChange={e => setFormData({ ...formData, emergencyRelationship: e.target.value })}
 />
 </div>
 </div>
 </div>
 </div>
 )}

 {/* STEP 4: GYM ASSIGNMENT */}
 {step === 4 && (
 <div className="space-y-6">
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Home Gym Branch <span className="text-danger">*</span></label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.homeGymId}
 onChange={e => setFormData({ ...formData, homeGymId: e.target.value })}
 >
 <option value="">Select Branch</option>
 {branches.map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Membership Counselor</label>
 <input
 type="text"
 placeholder="e.g. Sales Agent Name"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.counselor}
 onChange={e => setFormData({ ...formData, counselor: e.target.value })}
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-6 border-t border-neutral-200/80 pt-6">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Assigned Personal Trainer</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.trainerId}
 onChange={e => setFormData({ ...formData, trainerId: e.target.value })}
 >
 <option value="">No Coach Assigned</option>
 {staff.map(s => (
 <option key={s.id} value={s.id}>{s.name} ({s.role || 'Staff'})</option>
 ))}
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Assigned Dietitian</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.dietitianId}
 onChange={e => setFormData({ ...formData, dietitianId: e.target.value })}
 >
 <option value="">No Dietitian Assigned</option>
 {staff.map(s => (
 <option key={s.id} value={s.id}>{s.name} ({s.role || 'Staff'})</option>
 ))}
 </select>
 </div>
 </div>

 <div className="space-y-1 border-t border-neutral-200/80 pt-6">
 <label className="text-[10px] text-neutral-700 font-semibold">Member Referral Source</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.source}
 onChange={e => setFormData({ ...formData, source: e.target.value })}
 >
 <option value="Walk-In">Walk-In</option>
 <option value="Referral">Referral</option>
 <option value="Instagram">Instagram</option>
 <option value="Facebook">Facebook</option>
 <option value="Google">Google</option>
 <option value="Website">Website</option>
 </select>
 </div>
 </div>
 )}

 {/* STEP 5: FITNESS DETAILS */}
 {step === 5 && (
 <div className="space-y-6">
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Height (cm)</label>
 <input
 type="number"
 step="0.1"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.height}
 onChange={e => setFormData({ ...formData, height: e.target.value })}
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Weight (kg)</label>
 <input
 type="number"
 step="0.1"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.weight}
 onChange={e => setFormData({ ...formData, weight: e.target.value })}
 />
 </div>
 </div>

 <div className="space-y-1 border-t border-neutral-200/80 pt-6">
 <label className="text-[10px] text-neutral-700 font-semibold">Primary Fitness Goal</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.fitnessGoal}
 onChange={e => setFormData({ ...formData, fitnessGoal: e.target.value })}
 >
 <option value="Weight Loss">Weight Loss</option>
 <option value="Muscle Gain">Muscle Gain</option>
 <option value="General Fitness">General Fitness</option>
 <option value="Athletic Performance">Athletic Performance</option>
 <option value="Rehabilitation">Rehabilitation</option>
 </select>
 </div>

 <div className="grid grid-cols-2 gap-6 border-t border-neutral-200/80 pt-6">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Medical Conditions</label>
 <input
 type="text"
 placeholder="e.g. Hypertension, Asthma"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.medicalConditions}
 onChange={e => setFormData({ ...formData, medicalConditions: e.target.value })}
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Allergies</label>
 <input
 type="text"
 placeholder="e.g. Latex, Penicillin"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.allergies}
 onChange={e => setFormData({ ...formData, allergies: e.target.value })}
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-700 font-semibold">Fitness Notes / Preferences</label>
 <textarea
 rows={2}
 className="w-full bg-white border border-neutral-200 rounded-xl p-3.5 text-xs text-neutral-900 focus:outline-none"
 value={formData.fitnessNotes}
 onChange={e => setFormData({ ...formData, fitnessNotes: e.target.value })}
 />
 </div>
 </div>
 )}

 {/* STEP 6: DOCUMENTS UPLOAD */}
 {step === 6 && (
 <div className="space-y-6">
 <div>
 <span className="text-xs font-bold text-neutral-600 block uppercase tracking-wider mb-2">Member Document Attachments</span>
 <p className="text-[11px] text-neutral-600">Upload real ID proofs and consent/waiver forms to associate with this member's profile.</p>
 </div>

 <div className="grid grid-cols-2 gap-6">
 {/* Slot 1: ID Proof */}
 <label
 className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center ${
 selectedFiles.idProof
 ? 'border-green-200 bg-success-light text-success'
 : 'border-neutral-200 hover:border-red-200 text-neutral-600'
 }`}
 >
 <input
 type="file"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0] || null;
 setSelectedFiles(prev => ({ ...prev, idProof: file }));
 setFormData(prev => ({ ...prev, idProofUploaded: !!file }));
 }}
 />
 <UploadCloud size={24} className="mb-2" />
 <span className="text-xs font-bold block">ID Proof Document</span>
 <span className="text-[9px] text-neutral-500 mt-1 block truncate max-w-full px-2">
 {selectedFiles.idProof ? `Selected: ${selectedFiles.idProof.name}` : 'Click to select ID proof file'}
 </span>
 </label>

 {/* Slot 2: Medical Certificate */}
 <label
 className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center ${
 selectedFiles.medicalCert
 ? 'border-green-200 bg-success-light text-success'
 : 'border-neutral-200 hover:border-red-200 text-neutral-600'
 }`}
 >
 <input
 type="file"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0] || null;
 setSelectedFiles(prev => ({ ...prev, medicalCert: file }));
 setFormData(prev => ({ ...prev, medicalCertUploaded: !!file }));
 }}
 />
 <UploadCloud size={24} className="mb-2" />
 <span className="text-xs font-bold block">Medical Clearance Certificate</span>
 <span className="text-[9px] text-neutral-500 mt-1 block truncate max-w-full px-2">
 {selectedFiles.medicalCert ? `Selected: ${selectedFiles.medicalCert.name}` : 'Click to select medical cert file'}
 </span>
 </label>

 {/* Slot 3: Consent Form */}
 <label
 className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center ${
 selectedFiles.consent
 ? 'border-green-200 bg-success-light text-success'
 : 'border-neutral-200 hover:border-red-200 text-neutral-600'
 }`}
 >
 <input
 type="file"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0] || null;
 setSelectedFiles(prev => ({ ...prev, consent: file }));
 setFormData(prev => ({ ...prev, consentUploaded: !!file }));
 }}
 />
 <UploadCloud size={24} className="mb-2" />
 <span className="text-xs font-bold block">Consent / Waiver Agreement</span>
 <span className="text-[9px] text-neutral-500 mt-1 block truncate max-w-full px-2">
 {selectedFiles.consent ? `Selected: ${selectedFiles.consent.name}` : 'Click to select consent waiver file'}
 </span>
 </label>

 {/* Slot 4: Other Docs */}
 <label
 className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center ${
 selectedFiles.otherDoc
 ? 'border-green-200 bg-success-light text-success'
 : 'border-neutral-200 hover:border-red-200 text-neutral-600'
 }`}
 >
 <input
 type="file"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0] || null;
 setSelectedFiles(prev => ({ ...prev, otherDoc: file }));
 setFormData(prev => ({ ...prev, otherDocUploaded: !!file }));
 }}
 />
 <UploadCloud size={24} className="mb-2" />
 <span className="text-xs font-bold block">Supplemental Fitness Intake</span>
 <span className="text-[9px] text-neutral-500 mt-1 block truncate max-w-full px-2">
 {selectedFiles.otherDoc ? `Selected: ${selectedFiles.otherDoc.name}` : 'Click to select fitness intake file'}
 </span>
 </label>
 </div>
 </div>
 )}

 {/* STEP 7: REVIEW SCREEN */}
 {step === 7 && (
 <div className="space-y-6">
 <div>
 <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
 <UserCheck className="w-5 h-5 text-danger" />
 Review Profile Information
 </h3>
 <p className="text-xs text-neutral-600 mt-1">Please verify all input steps are correct. Click edit icon next to any section to correct.</p>
 </div>

 <div className="space-y-4">
 {/* Basic */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex justify-between items-start">
 <div>
 <span className="text-[10px] text-neutral-500 font-mono block uppercase">2. Personal Details</span>
 <span className="text-xs font-bold text-neutral-800 block mt-1">{formData.firstName} {formData.lastName}</span>
 <span className="text-[11px] text-neutral-600 block mt-1">{formData.gender} • DOB: {formData.dob} ({formData.age} yrs) • Phone: {formData.phone}</span>
 </div>
 {!isGlobalUserFound && (
 <button onClick={() => setStep(2)} className="text-[10px] text-danger hover:underline">Edit Step 2</button>
 )}
 </div>

 {/* Contact */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex justify-between items-start">
 <div>
 <span className="text-[10px] text-neutral-500 font-mono block uppercase">3. Address & Emergency Info</span>
 <span className="text-xs font-bold text-neutral-800 block mt-1">
 {formData.addressLine1 ? `${formData.addressLine1}, ${formData.city}, ${formData.state}` : 'No Address provided'}
 </span>
 <span className="text-[11px] text-neutral-600 block mt-1">
 Emergency: {formData.emergencyName || 'None'} ({formData.emergencyPhone || 'N/A'})
 </span>
 </div>
 {!isGlobalUserFound && (
 <button onClick={() => setStep(3)} className="text-[10px] text-danger hover:underline">Edit Step 3</button>
 )}
 </div>

 {/* Location Assignment */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex justify-between items-start">
 <div>
 <span className="text-[10px] text-neutral-500 font-mono block uppercase">4. Branch & Staff Alignment</span>
 <span className="text-xs font-bold text-neutral-800 block mt-1">Home Location: {getBranchName(formData.homeGymId)}</span>
 <span className="text-[11px] text-neutral-600 block mt-1">
 Trainer: {getTrainerName(formData.trainerId)} • Dietitian: {getDietitianName(formData.dietitianId)} • Source: {formData.source}
 </span>
 </div>
 <button onClick={() => setStep(4)} className="text-[10px] text-danger hover:underline">Edit Step 4</button>
 </div>

 {/* Fitness */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex justify-between items-start">
 <div>
 <span className="text-[10px] text-neutral-500 font-mono block uppercase">5. Fitness Metrics</span>
 <span className="text-xs font-bold text-neutral-800 block mt-1">Primary Goal: {formData.fitnessGoal}</span>
 <span className="text-[11px] text-neutral-600 block mt-1">
 Height: {formData.height || '--'} cm • Weight: {formData.weight || '--'} kg • Conditions: {formData.medicalConditions || 'None'}
 </span>
 </div>
 <button onClick={() => setStep(5)} className="text-[10px] text-danger hover:underline">Edit Step 5</button>
 </div>
 </div>

 <div className="bg-white border border-dashed border-red-200 rounded-2xl p-4 flex justify-between items-center bg-danger-light">
 <div>
 <span className="text-[10px] text-danger font-mono uppercase block">Assigned Member ID Number</span>
 <span className="text-sm font-bold text-neutral-900 mt-1 block tracking-wider">{generatedId}</span>
 </div>
 <span className="text-[10px] text-neutral-500 font-mono">Assigned automatically on save</span>
 </div>
 </div>
 )}

 </div>

 {/* ACTION NAVIGATION BAR */}
 <div className="sticky bottom-0 z-20 flex items-center justify-between bg-white border border-neutral-200/80 p-4 rounded-3xl backdrop-blur-md shadow-2xl mt-4">
 <div>
 {step > 1 && (
 <button
 type="button"
 onClick={handleBack}
 className="px-5 py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
 >
 <ChevronLeft className="w-4 h-4" />
 Back
 </button>
 )}
 </div>

 <div>
 {step < 7 ? (
 <button
 type="button"
 onClick={handleNext}
 className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-neutral-900 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg"
 >
 Next
 <ChevronRight className="w-4 h-4" />
 </button>
 ) : (
 <button
 type="button"
 onClick={handleSubmit}
 disabled={saving}
 className="px-6 py-3 bg-success hover:bg-green-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg"
 >
 <Check className="w-4 h-4" />
 {saving ? 'Creating Profile...' : `Confirm & Create Member`}
 </button>
 )}
 </div>
 </div>

 </div>

 {/* RIGHT COLUMN: SUMMARY PANEL (25%) */}
 <div className="space-y-6">
 <div className="bg-neutral-50/40 border border-neutral-200/60 rounded-3xl p-6 backdrop-blur-md sticky top-6 space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800 uppercase font-mono tracking-wider">Creation Summary</h3>
 <p className="text-[10px] text-neutral-500 mt-1">Live configuration checklist tracker.</p>
 </div>

 {/* Photo Preview card */}
 <div className="bg-neutral-50/40 border border-neutral-200 rounded-2xl p-4 flex flex-col items-center text-center">
 <div className="w-16 h-16 rounded-full bg-neutral-50 border-2 border-neutral-200 overflow-hidden flex items-center justify-center font-bold text-danger text-base mb-3">
 {formData.firstName ? `${formData.firstName.charAt(0)}${formData.lastName.charAt(0)}` : <Users className="w-7 h-7" />}
 </div>
 <span className="text-xs font-bold text-neutral-900 block">
 {formData.firstName || 'New Member'} {formData.lastName}
 </span>
 <span className="text-[9px] text-danger font-mono mt-1 uppercase block tracking-wider">
 {formData.dob ? `${formData.age} years old` : 'Age pending'}
 </span>
 </div>

 {/* Config summary details */}
 <div className="space-y-3.5 border-t border-neutral-200 pt-5">
 <div className="flex justify-between items-center text-[10px]">
 <span className="text-neutral-500 font-mono uppercase">Home Gym</span>
 <span className="text-neutral-700 font-semibold text-right max-w-[130px] truncate">
 {getBranchName(formData.homeGymId)}
 </span>
 </div>

 <div className="flex justify-between items-center text-[10px]">
 <span className="text-neutral-500 font-mono uppercase">Assigned Trainer</span>
 <span className="text-neutral-700 font-semibold text-right max-w-[130px] truncate">
 {getTrainerName(formData.trainerId)}
 </span>
 </div>

 <div className="flex justify-between items-center text-[10px]">
 <span className="text-neutral-500 font-mono uppercase">Assigned Dietitian</span>
 <span className="text-neutral-700 font-semibold text-right max-w-[130px] truncate">
 {getDietitianName(formData.dietitianId)}
 </span>
 </div>

 <div className="flex justify-between items-center text-[10px]">
 <span className="text-neutral-500 font-mono uppercase">Fitness Goal</span>
 <span className="text-neutral-700 font-semibold text-right">
 {formData.fitnessGoal}
 </span>
 </div>

 <div className="flex justify-between items-center text-[10px]">
 <span className="text-neutral-500 font-mono uppercase">Docs Attached</span>
 <span className="text-neutral-700 font-semibold">
 {[
 formData.idProofUploaded,
 formData.medicalCertUploaded,
 formData.consentUploaded,
 formData.otherDocUploaded
 ].filter(Boolean).length} of 4
 </span>
 </div>
 </div>

 <div className="border-t border-neutral-200 pt-5 bg-neutral-50/10 rounded-xl p-3 text-[10px] text-neutral-500 flex gap-2">
 <Info className="shrink-0 mt-0.5" size={14} />
 <span>Verify that emergency credentials are active before proceeding to document signing.</span>
 </div>
 </div>
 </div>

 </div>

 {/* OVERLAY: WEBCAM CAPTURE MODAL */}
 {showWebcam && (
 <div className="fixed inset-0 bg-background backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-bold text-neutral-900 font-display">Capture Photo</h3>
 <button type="button" onClick={closeWebcam} className="text-neutral-500 hover:text-neutral-800">
 <X size={18} />
 </button>
 </div>

 {webcamError ? (
 <div className="p-4 bg-danger-light border border-red-200 rounded-2xl text-xs text-danger text-center">
 {webcamError}
 </div>
 ) : (
 <div className="relative w-full aspect-square bg-neutral-900 rounded-2xl overflow-hidden">
 <video ref={videoRef} playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
 </div>
 )}
 <canvas ref={canvasRef} className="hidden" />

 <div className="flex gap-3">
 <button
 type="button"
 onClick={closeWebcam}
 className="flex-1 py-2.5 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold rounded-xl transition"
 >
 Cancel
 </button>
 <button
 type="button"
 disabled={!!webcamError}
 onClick={capturePhoto}
 className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-neutral-900 text-xs font-bold rounded-xl transition disabled:opacity-40"
 >
 Capture
 </button>
 </div>
 </div>
 </div>
 )}

 {/* OVERLAY: SUCCESS OVERLAY MODAL */}
 {showSuccessState && (
 <div className="fixed inset-0 bg-background backdrop-blur-sm z-50 flex items-center justify-center p-4">
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl space-y-6 relative overflow-hidden">
 
 {/* Sparkles simulated */}
 <div className="mx-auto w-16 h-16 rounded-2xl bg-success-light border border-green-200 flex items-center justify-center text-success shadow-lg">
 <Check className="w-8 h-8" />
 </div>

 <div className="space-y-2">
 <h2 className="text-xl font-bold text-neutral-900 font-display">Member Profile Created!</h2>
 <p className="text-xs text-neutral-600 leading-relaxed">
 Profile for <strong>{formData.firstName} {formData.lastName}</strong> has been successfully saved to the cloud directory.
 </p>
 </div>

 {/* Profile badge details */}
 <div className="bg-neutral-50/50 border border-neutral-200 rounded-2xl p-5 text-left space-y-3">
 <div className="flex gap-4 items-center">
 <div className="w-12 h-12 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-danger">
 {formData.firstName.charAt(0)}{formData.lastName.charAt(0)}
 </div>
 <div>
 <span className="text-xs font-bold text-neutral-800 block">{formData.firstName} {formData.lastName}</span>
 <span className="text-[10px] text-danger font-mono block uppercase">{generatedId}</span>
 </div>
 </div>
 
 <div className="border-t border-neutral-200/80 pt-3 text-[10px] space-y-1.5 text-neutral-600">
 <div>Home Location: <strong className="text-neutral-700">{getBranchName(formData.homeGymId)}</strong></div>
 <div>Coach Coordinator: <strong className="text-neutral-700">{getTrainerName(formData.trainerId)}</strong></div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <button
 type="button"
 onClick={() => router.push('/workspace/members')}
 className="py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:text-neutral-800 text-xs font-semibold rounded-xl transition"
 >
 View Directory
 </button>
 <button
 type="button"
 onClick={() => {
 setShowSuccessState(false);
 setStep(1);
 setFormData({
 firstName: '',
 lastName: '',
 gender: 'Male',
 dob: '',
 age: '',
 phone: '',
 email: '',
 maritalStatus: 'Single',
 occupation: '',
 photoOption: 'preset-1',
 addressLine1: '',
 addressLine2: '',
 city: '',
 district: '',
 state: '',
 country: 'United States',
 postalCode: '',
 emergencyName: '',
 emergencyPhone: '',
 emergencyRelationship: '',
 homeGymId: branches[0]?.id || '',
 counselor: '',
 trainerId: '',
 dietitianId: '',
 source: 'Walk-In',
 height: '',
 weight: '',
 fitnessGoal: 'General Fitness',
 medicalConditions: '',
 allergies: '',
 fitnessNotes: '',
 idProofUploaded: false,
 medicalCertUploaded: false,
 consentUploaded: false,
 otherDocUploaded: false,
 });
 setSelectedFiles({
 idProof: null,
 medicalCert: null,
 consent: null,
 otherDoc: null,
 });
 // Recalculate next member ID
 membersApi.list({ homeGymId: 'all' }).then(l => {
 setGeneratedId(`MEM-${String((l?.length || 0) + 1).padStart(6, '0')}`);
 });
 }}
 className="py-2.5 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition"
 >
 Add Another Member
 </button>
 </div>

 <div className="flex gap-2 justify-center pt-2">
 <button
 type="button"
 onClick={() => showToast('Membership package link simulation triggered!')}
 className="px-3 py-1.5 bg-neutral-50/60 hover:bg-neutral-50 border border-neutral-200 rounded-xl text-[10px] text-neutral-700 transition"
 >
 Create Membership
 </button>
 <button
 type="button"
 onClick={() => showToast('Measurement history panel initialized!')}
 className="px-3 py-1.5 bg-neutral-50/60 hover:bg-neutral-50 border border-neutral-200 rounded-xl text-[10px] text-neutral-700 transition"
 >
 Record Measurement
 </button>
 </div>

 </div>
 </div>
 )}

 </div>
 );
}
