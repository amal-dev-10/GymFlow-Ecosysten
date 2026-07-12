'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
 Users,
 ChevronLeft,
 ChevronRight,
 Calendar,
 Phone,
 Mail,
 MapPin,
 Clock,
 Sparkles,
 Award,
 BookOpen,
 DollarSign,
 Scale,
 Plus,
 Trash2,
 FileText,
 UserCheck,
 Check,
 TrendingUp,
 TrendingDown,
 Pin,
 Activity,
 Upload,
 AlertCircle,
 FileSpreadsheet,
 Lock,
 MessageSquare,
 Shield,
 Dumbbell,
 Apple,
 Camera,
 Download,
 Eye,
 RefreshCw,
 Zap,
 Flame,
 Sliders,
 AlertTriangle,
 Heart,
 History,
 User,
 Star,
 Play,
 Pause,
 Clipboard,
 BarChart3,
 X
} from 'lucide-react';
import { membersApi, gymApi, rolesApi, orgApi, membershipsApi, documentsApi, attendanceApi, freezeApi } from '../../../../lib/api';
import { Tabs } from '../../../../components/ui';

interface Employee {
 id: string;
 name: string;
 role?: string;
 roleNames?: string[];
}

export default function MemberProfileDetailsPage() {
 const router = useRouter();
 const params = useParams();
 const id = params.id as string;

 // States
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [member, setMember] = useState<any>(null);
 const [branches, setBranches] = useState<any[]>([]);
 const [staffList, setStaffList] = useState<Employee[]>([]);
 const [orgPlans, setOrgPlans] = useState<any[]>([]);
 const [activeTab, setActiveTab] = useState('overview');
 const [currentUser, setCurrentUser] = useState<any>(null);
 const [userRole, setUserRole] = useState('owner'); // owner, manager, receptionist, trainer, dietitian

 // Drawer / Dialog states
 const [showDrawer, setShowDrawer] = useState(false);
 const [drawerAction, setDrawerAction] = useState<string | null>(null);

 // Form states inside drawers
 const [noteContent, setNoteContent] = useState('');
 const [noteType, setNoteType] = useState('General'); // Medical, Trainer, Dietitian, Reception, General
 const [newMeasurement, setNewMeasurement] = useState({
 height: '',
 weight: '',
 bodyFatPercentage: '',
 chest: '',
 waist: '',
 hip: '',
 arm: '',
 thigh: '',
 });
 const [newMembership, setNewMembership] = useState({
 planName: '',
 amount: '',
 durationMonths: '',
 });
 const [newPayment, setNewPayment] = useState({
 invoiceNumber: 'INV-7790',
 amount: '150',
 method: 'Credit Card',
 });
 const [newWorkout, setNewWorkout] = useState({
 programName: 'Hypertrophy Phase A',
 notes: 'Focus on progressive overload. 4 sets of 8-12 reps.',
 });

 // Member Workouts Tab sub-views and wizard states
 const [workoutsSubTab, setWorkoutsSubTab] = useState<'dashboard' | 'calendar' | 'history' | 'analytics'>('dashboard');
 const [wizardOpen, setWizardOpen] = useState(false);
 const [wizardStep, setWizardStep] = useState(1);
 const [wizardSource, setWizardSource] = useState('Official Programs');
 const [wizardSearch, setWizardSearch] = useState('');
 const [wizardDifficulty, setWizardDifficulty] = useState('all');
 const [wizardGoal, setWizardGoal] = useState('all');
 const [wizardSelectedProg, setWizardSelectedProg] = useState<any>(null);
 
 // Customization fields
 const [wizardWorkoutDays, setWizardWorkoutDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
 const [wizardExercises, setWizardExercises] = useState<any[]>([
 { name: 'Barbell Back Squat', sets: 3, reps: '10', rest: '90s', notes: 'Focus on depth' },
 { name: 'Leg Extensions', sets: 3, reps: '12', rest: '60s', notes: '' },
 { name: 'Romanian Dumbbell Deadlift', sets: 3, reps: '10', rest: '90s', notes: '' }
 ]);
 const [wizardTrainerNotes, setWizardTrainerNotes] = useState('');
 
 // Private / public note content
 const [trainerPrivateNote, setTrainerPrivateNote] = useState('');
 const [trainerVisibleNote, setTrainerVisibleNote] = useState('');

 // Medical Restrictions
 const [medicalRestrictions, setMedicalRestrictions] = useState<string[]>([
 'Left shoulder impingement',
 'Keep bench press weight targets below 80kg',
 'Avoid extreme thoracic spine loading overhead'
 ]);
 const [newDiet, setNewDiet] = useState({
 planName: 'Keto Lean Bulking',
 dailyCalories: '2800',
 proteinGrams: '180',
 carbGrams: '80',
 fatGrams: '110',
 });
 const [newDocument, setNewDocument] = useState({
 documentType: 'ID Proof',
 fileName: '',
 });
 const [selectedFile, setSelectedFile] = useState<File | null>(null);
 const fileInputRef = React.useRef<HTMLInputElement>(null);
 const [timelinePage, setTimelinePage] = useState(1);

 // Freeze state
 const [showFreezeDrawer, setShowFreezeDrawer] = useState(false);
 const [freezeSubId, setFreezeSubId] = useState('');
 const [freezeStartDate, setFreezeStartDate] = useState('');
 const [freezeEndDate, setFreezeEndDate] = useState('');
 const [freezeReasonCat, setFreezeReasonCat] = useState('Medical');
 const [freezeNotesText, setFreezeNotesText] = useState('');
 const [freezeSubmitting, setFreezeSubmitting] = useState(false);
 const [memberFreezes, setMemberFreezes] = useState<any[]>([]);

 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const loadData = async () => {
 try {
 setLoading(true);
 // Get current logged-in user and role
 const userStr = localStorage.getItem('user');
 if (userStr) {
 try {
 const u = JSON.parse(userStr);
 setCurrentUser(u);
 if (u.role) {
 setUserRole(u.role.toLowerCase());
 }
 } catch (_) { }
 }

 // Fetch branches and staff
 const orgId = localStorage.getItem('organizationId') || '';
 const bList = await gymApi.list(orgId);
 setBranches(bList || []);

 const staff = await rolesApi.getEmployees();
 setStaffList(staff || []);

 // Fetch membership plans from database
 const dbPlans = await membershipsApi.listPlans();
 setOrgPlans(dbPlans || []);
 if (dbPlans && dbPlans.length > 0) {
 const firstPlan = dbPlans[0];
 setNewMembership({
 planName: firstPlan.name,
 amount: String(firstPlan.basePrice),
 durationMonths: String(firstPlan.durationValue)
 });
 }

 // Fetch member detail
 const details = await membersApi.get(id);
 setMember(details);

 // Load freeze records for this member's subscriptions
 try {
  const allFreezes = await freezeApi.list();
  const memberSubIds = new Set(
   (details?.memberMemberships || []).map((mm: any) => mm.id)
  );
  const myFreezes = allFreezes.filter((f: any) => memberSubIds.has(f.memberMembershipId));
  setMemberFreezes(myFreezes);
 } catch (_) {}

 // Default the new measurement inputs if member measurements exist
 if (details.memberMeasurements && details.memberMeasurements.length > 0) {
 const latest = details.memberMeasurements[0];
 setNewMeasurement({
 height: String(latest.height || ''),
 weight: String(latest.weight || ''),
 bodyFatPercentage: String(latest.bodyFatPercentage || ''),
 chest: String(latest.chest || ''),
 waist: String(latest.waist || ''),
 hip: String(latest.hip || ''),
 arm: String(latest.arm || ''),
 thigh: String(latest.thigh || ''),
 });
 }
 } catch (err) {
 console.error(err);
 showToast('Failed to load member profile', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [id]);

 // Helper properties
 const ai = member?.aiInsights || {};
 const linkedAccountsCount = member?.linkedAccountsCount || 0;
 const isGlobalUserFound = linkedAccountsCount > 0;
 const genderLabel = member?.gender || 'Male';
 const ageLabel = member?.dob
 ? String(new Date().getFullYear() - new Date(member.dob).getFullYear())
 : 'N/A';
 const memberId = ai.memberNumber || 'MEM-000000';
 const memberStatus = ai.status || 'Active';

 // Permission Checkers
 const hasFullAccess = userRole === 'owner' || userRole === 'manager';
 const isReceptionist = userRole === 'receptionist';
 const isTrainer = userRole === 'trainer';
 const isDietitian = userRole === 'dietitian';

 const canViewTab = (tabName: string) => {
 if (hasFullAccess) return true;
 if (isReceptionist) {
 return ['overview', 'memberships', 'attendance', 'billing', 'documents', 'activity-timeline', 'notes', 'settings'].includes(tabName);
 }
 if (isTrainer) {
 return ['overview', 'workouts', 'measurements', 'progress', 'activity-timeline', 'notes', 'settings'].includes(tabName);
 }
 if (isDietitian) {
 return ['overview', 'diet-plans', 'measurements', 'progress', 'activity-timeline', 'notes', 'settings'].includes(tabName);
 }
 return false;
 };

 const canExecuteAction = (actionName: string) => {
 if (hasFullAccess) return true;
 if (isReceptionist) {
 return ['create-membership', 'record-payment', 'upload-document', 'mark-attendance', 'freeze-membership'].includes(actionName);
 }
 if (isTrainer) {
 return ['assign-workout', 'record-measurement'].includes(actionName);
 }
 if (isDietitian) {
 return ['assign-diet', 'record-measurement'].includes(actionName);
 }
 return false;
 };

 const memberships = ai.membershipsList || [];

 const attendanceLogs = (member?.attendances || []).map((att: any) => ({
 date: new Date(att.checkInTime).toISOString().split('T')[0],
 time: new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 branch: att.gym?.name || 'Main Branch',
 status: att.status || 'Checked In'
 }));

 const getPast7Days = () => {
 const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
 const result = [];
 for (let i = 6; i >= 0; i--) {
 const d = new Date();
 d.setDate(d.getDate() - i);
 const dayName = days[d.getDay()];
 const dateStr = d.toISOString().split('T')[0];
 const count = attendanceLogs.filter((l: any) => l.date === dateStr).length;
 result.push({
 day: dayName,
 count,
 label: `${count} check-in${count !== 1 ? 's' : ''}`
 });
 }
 return result;
 };
 const visitFrequencyTrend = getPast7Days();
 const maxVisitCount = Math.max(...visitFrequencyTrend.map(v => v.count), 1);

 const invoices = ai.invoicesList || [];

 const workoutsList = ai.workoutsList || [];

 const dietsList = ai.dietsList || [];

 const notes = ai.staffNotes || [];

 const timelineEvents = ai.timelineEvents || (member?.createdAt ? [
 { id: 't-created', type: 'Member Created', timestamp: new Date(member.createdAt).toLocaleString(), user: 'System' }
 ] : []);

 // Dynamic snapshot & metrics calculations
 const activeMembership = memberships.find((m: any) => m.status.toLowerCase() === 'active') || memberships[0];
 const hasActiveMembership = memberships.some((m: any) => m.status.toLowerCase() === 'active');
 const currentPlanName = activeMembership && memberships.length > 0 ? activeMembership.plan : 'No Active Plan';

 const getRemainingDays = (endDateStr: string) => {
 if (!endDateStr) return 'N/A';
 const diffTime = new Date(endDateStr).getTime() - new Date().getTime();
 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
 return diffDays > 0 ? `${diffDays} days` : 'Expired';
 };
 const remainingDaysText = activeMembership ? getRemainingDays(activeMembership.end) : '0 days';
 const renewalDateText = activeMembership ? new Date(activeMembership.end).toISOString().split('T')[0] : 'N/A';

 const outstandingBalance = invoices
 .filter((inv: any) => inv.status.toLowerCase() === 'outstanding' || inv.status.toLowerCase() === 'unpaid')
 .reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);

 const todayStr = new Date().toISOString().split('T')[0];
 const todayLog = attendanceLogs.find((l: any) => l.date === todayStr);
 const todayCheckInText = todayLog ? `Logged` : 'Not Checked In';
 const todayCheckInTime = todayLog ? todayLog.time : 'NA'

 const attendanceRate = attendanceLogs.length > 0 ? Math.min(100, Math.round((attendanceLogs.length / 12) * 100)) : 0;
 const healthScoreText = attendanceLogs.length > 0 ? `${attendanceRate}%` : 'N/A';
 const healthLabelText = attendanceLogs.length > 0
 ? (attendanceRate >= 80 ? 'Good' : attendanceRate >= 50 ? 'Average' : 'Needs Improvement')
 : 'No Data';

 const paidMembershipTotal = memberships
 .filter((m: any) => m.status.toLowerCase() === 'active' || m.status.toLowerCase() === 'expired' || m.status.toLowerCase() === 'completed')
 .reduce((sum: number, m: any) => sum + Number(m.amount), 0);
 const paidInvoiceTotal = invoices
 .filter((inv: any) => inv.status.toLowerCase() === 'paid')
 .reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);
 const lifetimeRevenue = paidMembershipTotal + paidInvoiceTotal;

 const latestMeasurement = member?.memberMeasurements && member.memberMeasurements.length > 0
 ? member.memberMeasurements[0]
 : null;

 const bodyDimensions = ai.bodyDimensions || {};

 const weightCurveData = member?.memberMeasurements && member.memberMeasurements.length > 0
 ? [...member.memberMeasurements]
 .reverse()
 .slice(-6)
 .map((m: any) => ({
 val: m.weight,
 date: new Date(m.date || m.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
 }))
 : [];

 const timelineItemsPerPage = 5;
 const totalTimelinePages = Math.ceil(timelineEvents.length / timelineItemsPerPage) || 1;
 const timelineStartIndex = (timelinePage - 1) * timelineItemsPerPage;
 const paginatedTimeline = timelineEvents.slice(timelineStartIndex, timelineStartIndex + timelineItemsPerPage);

 // Actions
 const handleAddNote = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!noteContent.trim()) return;

 try {
 setSaving(true);
 const newNote = {
 id: 'note-' + Date.now(),
 author: currentUser?.name || 'Staff Member',
 role: userRole,
 timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
 content: noteContent,
 type: noteType
 };

 const updatedNotes = [newNote, ...notes];
 const updatedTimeline = [
 { id: 't-note-' + Date.now(), type: 'Staff Note Added', timestamp: new Date().toLocaleString(), user: currentUser?.name || 'Staff' },
 ...timelineEvents
 ];

 await membersApi.update(id, {
 aiInsights: {
 staffNotes: updatedNotes,
 timelineEvents: updatedTimeline
 }
 });

 setNoteContent('');
 showToast('Note added successfully');
 loadData();
 } catch (err) {
 console.error(err);
 showToast('Failed to save note', 'error');
 } finally {
 setSaving(false);
 }
 };

 const handleCreateMeasurement = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 setSaving(true);
 const parsedHeight = newMeasurement.height ? parseFloat(newMeasurement.height) : undefined;
 const parsedWeight = newMeasurement.weight ? parseFloat(newMeasurement.weight) : undefined;
 const parsedFat = newMeasurement.bodyFatPercentage ? parseFloat(newMeasurement.bodyFatPercentage) : undefined;

 await membersApi.addMeasurement(id, {
 height: parsedHeight,
 weight: parsedWeight,
 bodyFatPercentage: parsedFat
 });

 // Update remaining body dimensions in aiInsights
 const updatedTimeline = [
 { id: 't-measure-' + Date.now(), type: 'Measurements Updated', timestamp: new Date().toLocaleString(), user: currentUser?.name || 'Staff' },
 ...timelineEvents
 ];

 await membersApi.update(id, {
 aiInsights: {
 bodyDimensions: {
 chest: newMeasurement.chest,
 waist: newMeasurement.waist,
 hip: newMeasurement.hip,
 arm: newMeasurement.arm,
 thigh: newMeasurement.thigh
 },
 timelineEvents: updatedTimeline
 }
 });

 showToast('Metrics recorded successfully');
 setShowDrawer(false);
 loadData();
 } catch (err) {
 console.error(err);
 showToast('Failed to save metrics', 'error');
 } finally {
 setSaving(false);
 }
 };

 const handleUpdateStaff = async (roleType: 'trainer' | 'dietitian' | 'counselor', staffName: string) => {
 try {
 setSaving(true);
 const updatePayload: any = {};
 if (roleType === 'trainer') {
 updatePayload.assignedTrainerName = staffName;
 } else if (roleType === 'dietitian') {
 updatePayload.assignedDietitianName = staffName;
 } else if (roleType === 'counselor') {
 updatePayload.counselor = staffName;
 }

 const updatedTimeline = [
 { id: 't-staff-' + Date.now(), type: `Staff Assigned: ${roleType}`, timestamp: new Date().toLocaleString(), user: currentUser?.name || 'Staff' },
 ...timelineEvents
 ];

 await membersApi.update(id, {
 aiInsights: {
 ...updatePayload,
 timelineEvents: updatedTimeline
 }
 });

 showToast('Staff assignment updated');
 loadData();
 } catch (err) {
 console.error(err);
 showToast('Failed to update staff assignment', 'error');
 } finally {
 setSaving(false);
 }
 };

 const handleAssignProgramWizardSubmit = async () => {
 if (!wizardSelectedProg) {
 showToast('No program template selected.', 'error');
 return;
 }

 const newProgObj = {
 id: 'w-' + Date.now(),
 name: wizardSelectedProg.name,
 assignedBy: currentUser?.name || 'Trainer Desk',
 compRate: 0,
 date: new Date().toISOString().split('T')[0],
 difficulty: wizardSelectedProg.difficulty || 'Intermediate',
 goal: wizardSelectedProg.goal || 'Strength',
 weeks: wizardWorkoutDays.join(', '),
 exercises: wizardExercises,
 notes: wizardTrainerNotes || 'Start progressive loading schedule.'
 };

 const updatedWorkouts = [newProgObj, ...workoutsList];
 const updatedTimeline = [
 {
 id: 't-' + Date.now(),
 type: `Workout Program Assigned: ${wizardSelectedProg.name}`,
 timestamp: new Date().toLocaleDateString(),
 user: currentUser?.name || 'Trainer Desk'
 },
 ...timelineEvents
 ];

 try {
 setSaving(true);
 await membersApi.update(id, {
 aiInsights: {
 ...ai,
 workoutsList: updatedWorkouts,
 timelineEvents: updatedTimeline
 }
 });
 showToast('Workout Program assigned successfully.', 'success');
 setWizardOpen(false);
 setWizardStep(1);
 loadData();
 } catch (_) {
 showToast('Failed to assign workout program.', 'error');
 } finally {
 setSaving(false);
 }
 };

 const handleDrawerSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 setSaving(true);
 const updatedTimeline = [
 { id: 't-act-' + Date.now(), type: `Action Triggered: ${drawerAction}`, timestamp: new Date().toLocaleString(), user: currentUser?.name || 'Staff' },
 ...timelineEvents
 ];

 if (drawerAction === 'create-membership') {
 const selectedPlan = orgPlans.find(p => p.name === newMembership.planName);
 if (!selectedPlan) {
 showToast('Invalid membership plan selected', 'error');
 setSaving(false);
 return;
 }

 const startDate = new Date().toISOString().split('T')[0];
 const endDate = new Date(new Date().setMonth(new Date().getMonth() + parseInt(newMembership.durationMonths))).toISOString().split('T')[0];

 await membershipsApi.purchaseMembership({
 memberId: id,
 membershipPlanId: selectedPlan.id,
 startDate,
 endDate,
 amountPaid: parseFloat(newMembership.amount),
 status: 'Active',
 });
 } else if (drawerAction === 'record-payment') {
 const updatedInvoices = [
 {
 id: newPayment.invoiceNumber,
 amount: parseFloat(newPayment.amount),
 status: 'Paid',
 dueDate: new Date().toISOString().split('T')[0]
 },
 ...invoices
 ];
 await membersApi.update(id, {
 aiInsights: {
 invoicesList: updatedInvoices,
 timelineEvents: updatedTimeline
 }
 });
 } else if (drawerAction === 'assign-workout') {
 const updatedWorkouts = [
 {
 id: 'w-' + Date.now(),
 name: newWorkout.programName,
 assignedBy: currentUser?.name || 'Trainer Desk',
 compRate: 0,
 date: new Date().toISOString().split('T')[0]
 },
 ...workoutsList
 ];
 await membersApi.update(id, {
 aiInsights: {
 workoutsList: updatedWorkouts,
 timelineEvents: updatedTimeline
 }
 });
 } else if (drawerAction === 'assign-diet') {
 const updatedDiets = [
 {
 id: 'd-' + Date.now(),
 name: newDiet.planName,
 calories: parseInt(newDiet.dailyCalories),
 assignedBy: currentUser?.name || 'Dietitian Desk',
 date: new Date().toISOString().split('T')[0]
 },
 ...dietsList
 ];
 await membersApi.update(id, {
 aiInsights: {
 dietsList: updatedDiets,
 timelineEvents: updatedTimeline
 }
 });
 } else if (drawerAction === 'upload-document') {
 if (!selectedFile) {
 showToast('Please select a file to upload', 'error');
 setSaving(false);
 return;
 }

 let mappedDocType = 'ID_PROOF';
 if (newDocument.documentType === 'Medical Certificate') mappedDocType = 'MEDICAL';
 if (newDocument.documentType === 'Consent Waiver') mappedDocType = 'CONSENT';

 const { presignedUrl, finalUrl } = await documentsApi.generatePresignedUrl({
 targetId: id,
 targetType: 'MEMBER',
 fileName: selectedFile.name,
 contentType: selectedFile.type,
 });

 try {
 const axios = (await import('axios')).default;
 await axios.put(presignedUrl, selectedFile, {
 headers: { 'Content-Type': selectedFile.type },
 });
 await documentsApi.confirmUpload({
 targetId: id,
 targetType: 'MEMBER',
 documentType: mappedDocType,
 url: finalUrl,
 });
 } catch (uploadErr) {
 console.warn('S3 upload failed, executing fallback to create record directly', uploadErr);
 await documentsApi.confirmUpload({
 targetId: id,
 targetType: 'MEMBER',
 documentType: mappedDocType,
 url: finalUrl,
 });
 }

 // Add to timeline
 const updatedTimeline = [
 { id: 't-doc-' + Date.now(), type: `Document Uploaded: ${newDocument.documentType}`, timestamp: new Date().toLocaleString(), user: currentUser?.name || 'Staff' },
 ...timelineEvents
 ];
 await membersApi.update(id, {
 aiInsights: {
 timelineEvents: updatedTimeline
 }
 });

 setSelectedFile(null);
 showToast('Document uploaded successfully');
 }

 showToast(`Action ${drawerAction} submitted successfully`);
 setShowDrawer(false);
 loadData();
 } catch (err) {
 console.error(err);
 showToast('Error executing action', 'error');
 } finally {
 setSaving(false);
 }
 };

 const handleUpdateStatus = async (newStatus: string) => {
 try {
 setSaving(true);
 const updatedTimeline = [
 { id: 't-status-' + Date.now(), type: `Status Changed to ${newStatus}`, timestamp: new Date().toLocaleString(), user: currentUser?.name || 'Staff' },
 ...timelineEvents
 ];
 await membersApi.update(id, {
 aiInsights: {
 status: newStatus,
 timelineEvents: updatedTimeline
 }
 });
 showToast(`Member status changed to ${newStatus}`);
 loadData();
 } catch (err) {
 console.error(err);
 showToast('Failed to update status', 'error');
 } finally {
 setSaving(false);
 }
 };

 const openFreezeDrawer = (subId?: string) => {
 const today = new Date().toISOString().split('T')[0];
 const end = new Date();
 end.setDate(end.getDate() + 15);
 setFreezeStartDate(today);
 setFreezeEndDate(end.toISOString().split('T')[0]);
 setFreezeReasonCat('Medical');
 setFreezeNotesText('');
 if (subId) {
  setFreezeSubId(subId);
 } else {
  const activeSub = memberships.find((m: any) => m.status.toLowerCase() === 'active');
  setFreezeSubId(activeSub?.id || '');
 }
 setShowFreezeDrawer(true);
 };

 const handleFreezeSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!freezeSubId) {
  showToast('No active subscription selected', 'error');
  return;
 }
 const start = new Date(freezeStartDate);
 const end = new Date(freezeEndDate);
 const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
 try {
  setFreezeSubmitting(true);
  await freezeApi.requestFreeze({
  memberMembershipId: freezeSubId,
  startDate: start.toISOString(),
  endDate: end.toISOString(),
  durationDays,
  reasonCategory: freezeReasonCat,
  reasonNotes: freezeNotesText || undefined,
  });
  showToast('Freeze hold request submitted for review');
  setShowFreezeDrawer(false);
  loadData();
 } catch (err) {
  showToast('Failed to submit freeze request', 'error');
 } finally {
  setFreezeSubmitting(false);
 }
 };

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex items-center justify-center text-xs text-neutral-500 animate-pulse">
 Fetching 360° member records...
 </div>
 );
 }

 // Active status color helper
 const getStatusBadge = (status: string) => {
 const s = status.toLowerCase();
 if (s === 'active') return 'bg-success-light text-success border-green-200';
 if (s === 'frozen') return 'bg-sky-500/10 text-sky-450 border-sky-500/25';
 if (s === 'inactive') return 'bg-neutral-100/20 text-neutral-600 border-neutral-200/30';
 if (s === 'expired') return 'bg-warning-light text-amber-700 border-amber-200';
 if (s === 'suspended') return 'bg-danger-light text-danger border-red-200';
 return 'bg-purple-500/10 text-purple-450 border-purple-500/25'; // pending
 };

 return (
 <div className="min-h-screen bg-white text-neutral-900 p-8 flex flex-col gap-6 relative overflow-hidden">

 {/* Toast Notification */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border ${toast.type === 'success'
 ? 'bg-success-light text-success border-green-200'
 : 'bg-danger-light text-danger border-red-200'
 }`}>
 <span className="text-sm font-medium">{toast.message}</span>
 </div>
 )}

 {/* HEADER BAR */}
 <div className="flex items-center justify-between border-b border-neutral-200/80 pb-6">
 <div className="flex items-center gap-4">
 <button
 onClick={() => router.push('/workspace/members')}
 className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 hover:text-neutral-800 transition"
 >
 <ChevronLeft size={16} />
 </button>
 <div>
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Member Profile</span>
 <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-danger-light border border-red-200 text-danger uppercase">
 {isGlobalUserFound ? `Global · ${linkedAccountsCount} Other Gym${linkedAccountsCount > 1 ? 's' : ''}` : 'Local Account'}
 </span>
 {member.phoneVerified && (
 <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-success-light border border-green-200 text-success uppercase flex items-center gap-1">
 <Check size={10} /> Phone Verified
 </span>
 )}
 </div>
 <h1 className="text-2xl font-bold text-neutral-900 font-display mt-0.5">
 {member.firstName} {member.lastName}
 </h1>
 </div>
 </div>

 <div className="flex items-center gap-2">
 {/* Permission label indicator */}
 <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50/50 border border-neutral-200/60 rounded-xl text-xs text-neutral-600 font-medium uppercase">
 <Shield size={13} className="text-danger" />
 <span>{userRole}</span>
 </div>
 <button
 onClick={() => {
 setDrawerAction('edit-member');
 setShowDrawer(true);
 }}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-800 text-xs font-semibold rounded-xl transition"
 >
 Edit Profile
 </button>
 </div>
 </div>

 {!ai.onboardingCompleted && (!ai.trainerId || !ai.counselor || !ai.fitnessGoal) && (
 <div className="bg-primary-light border border-primary/20 rounded-3xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-md">
 <div className="flex gap-3 items-start">
 <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
 <div>
 <span className="text-xs font-bold text-neutral-900 block">Incomplete Onboarding Wizard Profile</span>
 <span className="text-[10px] text-neutral-600 mt-1 block font-sans">
 This member was registered publicly. Staff need to complete Step 4 to 7 (Home gym, trainer assignments, fitness goals, and documents).
 </span>
 </div>
 </div>
 <button
 onClick={() => router.push(`/workspace/members/create?memberId=${id}`)}
 className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-[11px] font-bold rounded-xl transition shadow-md shrink-0"
 >
 Complete Onboarding Wizard
 </button>
 </div>
 )}

 {/* MEMBER SUMMARY INFO HEADER CARD */}
 <div className="bg-neutral-50/20 border border-neutral-200/50 rounded-3xl p-6 backdrop-blur-md grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
 <div className="flex items-center gap-4 lg:col-span-2">
 <div className="w-16 h-16 rounded-2xl bg-primary-light border-2 border-neutral-200 flex items-center justify-center font-bold text-danger text-xl font-display uppercase shrink-0">
 {member.firstName.charAt(0)}{member.lastName.charAt(0)}
 </div>
 <div>
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-base font-bold text-neutral-900">{member.firstName} {member.lastName}</span>
 <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(memberStatus)}`}>
 {memberStatus}
 </span>
 </div>
 <span className="text-xs text-neutral-600 block mt-1 font-mono">{memberId} • Joined {new Date(member.createdAt).toLocaleDateString()}</span>
 <span className="text-xs text-neutral-500 flex items-center gap-1.5 mt-1.5">
 <MapPin size={12} className="text-neutral-400 shrink-0" />
 {member.homeGym?.name || 'Unassigned Branch'}
 </span>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-x-4 gap-y-3 lg:col-span-2 border-t lg:border-t-0 lg:border-l border-neutral-200/60 pt-4 lg:pt-0 lg:pl-6">
 <div className="flex items-start gap-2">
 <UserCheck size={14} className="text-neutral-400 shrink-0 mt-0.5" />
 <div className="min-w-0">
 <span className="text-neutral-500 block uppercase text-[10px] tracking-wide">Coach</span>
 <span className="text-neutral-800 font-semibold text-xs block truncate">{ai.assignedTrainerName || 'Not Assigned'}</span>
 </div>
 </div>
 <div className="flex items-start gap-2">
 <Apple size={14} className="text-neutral-400 shrink-0 mt-0.5" />
 <div className="min-w-0">
 <span className="text-neutral-500 block uppercase text-[10px] tracking-wide">Dietitian</span>
 <span className="text-neutral-800 font-semibold text-xs block truncate">{ai.assignedDietitianName || 'Not Assigned'}</span>
 </div>
 </div>
 <div className="flex items-start gap-2">
 <Mail size={14} className="text-neutral-400 shrink-0 mt-0.5" />
 <div className="min-w-0">
 <span className="text-neutral-500 block uppercase text-[10px] tracking-wide">Email</span>
 <span className="text-neutral-700 text-xs block truncate">{ai.email || 'N/A'}</span>
 </div>
 </div>
 <div className="flex items-start gap-2">
 <Phone size={14} className="text-neutral-400 shrink-0 mt-0.5" />
 <div className="min-w-0">
 <span className="text-neutral-500 block uppercase text-[10px] tracking-wide">Phone</span>
 <span className="text-neutral-700 text-xs block truncate">{member.phoneNumber}</span>
 </div>
 </div>
 </div>
 </div>

 {/* QUICK ACTION BUTTONS HUB */}
 <div className="flex flex-wrap items-center gap-2.5">
 {canExecuteAction('mark-attendance') && (
 <button
 disabled={!!todayLog || saving}
 onClick={async () => {
 if (todayLog) return;
 try {
 setSaving(true);
 await attendanceApi.checkIn({
 memberId: id,
 gymId: member.homeGymId,
 method: 'FRONT_DESK',
 memberName: `${member.firstName} ${member.lastName}`
 });
 showToast('Attendance logged for today!');
 loadData();
 } catch (err) {
 console.error(err);
 showToast('Error marking attendance', 'error');
 } finally {
 setSaving(false);
 }
 }}
 className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm ${todayLog
 ? 'border border-green-200 bg-success-light text-success cursor-not-allowed opacity-90'
 : 'bg-primary hover:bg-primary-hover text-white'
 }`}
 >
 <Check size={14} />
 {todayLog ? 'Already Checked In' : 'Check-In Today'}
 </button>
 )}
 {canExecuteAction('record-payment') && (
 <button
 onClick={() => { setDrawerAction('record-payment'); setShowDrawer(true); }}
 className="px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 text-neutral-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <DollarSign size={14} className="text-danger" />
 Record Payment
 </button>
 )}
 {canExecuteAction('create-membership') && (
 <button
 onClick={() => router.push(`/workspace/memberships/purchase?memberId=${id}`)}
 className="px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 text-neutral-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <Award size={14} className="text-danger" />
 Create Membership
 </button>
 )}
 {canExecuteAction('freeze-membership') && hasActiveMembership && (
 <button
  onClick={() => openFreezeDrawer()}
  className="px-3 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-sky-600 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
  <Pause size={14} />
  Freeze Membership
 </button>
 )}

 {(canExecuteAction('assign-workout') || canExecuteAction('assign-diet') || canExecuteAction('record-measurement') || canExecuteAction('upload-document')) && (
 <div className="w-px h-6 bg-neutral-200 mx-0.5 hidden sm:block" />
 )}

 {canExecuteAction('assign-workout') && (
 <button
 onClick={() => { setDrawerAction('assign-workout'); setShowDrawer(true); }}
 className="px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 text-neutral-600 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <Dumbbell size={14} />
 Assign Workout
 </button>
 )}
 {canExecuteAction('assign-diet') && (
 <button
 onClick={() => { setDrawerAction('assign-diet'); setShowDrawer(true); }}
 className="px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 text-neutral-600 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <Apple size={14} />
 Assign Diet Plan
 </button>
 )}
 {canExecuteAction('record-measurement') && (
 <button
 onClick={() => { setDrawerAction('record-measurement'); setShowDrawer(true); }}
 className="px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 text-neutral-600 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <Scale size={14} />
 Record Biometrics
 </button>
 )}
 {canExecuteAction('upload-document') && (
 <button
 onClick={() => { setDrawerAction('upload-document'); setShowDrawer(true); }}
 className="px-3 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 text-neutral-600 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
 >
 <Upload size={14} />
 Upload ID/Consent
 </button>
 )}
 </div>

 {/* Active freeze alert banner */}
 {memberFreezes.filter(f => f.status === 'Approved').length > 0 && (
 <div className="bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3 flex items-center gap-3 text-xs">
  <Pause className="w-4 h-4 text-sky-500 shrink-0" />
  <div className="flex-1">
  <span className="font-bold text-sky-700 block">Membership Currently Frozen</span>
  {memberFreezes.filter(f => f.status === 'Approved').map(f => (
   <span key={f.id} className="text-[10px] text-sky-600 font-mono block">
   {f.startDate?.split('T')[0]} → {f.endDate?.split('T')[0]} · {f.durationDays}d hold · {f.reasonCategory}
   </span>
  ))}
  </div>
  <button
  onClick={() => router.push('/workspace/memberships/freeze')}
  className="px-3 py-1.5 bg-sky-100 border border-sky-200 text-sky-700 text-[10px] font-bold rounded-lg"
  >
  Manage Freezes
  </button>
 </div>
 )}

 {/* KPI METRIC CARDS */}
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
 {/* Status */}
 <div className={`border rounded-2xl p-4 ${memberFreezes.some(f => f.status === 'Approved') ? 'bg-sky-50 border-sky-200' : 'bg-neutral-50/40 border-neutral-200/60'}`}>
 <span className="text-[11px] text-neutral-500 flex items-center gap-1.5 uppercase tracking-wide"><Activity size={12} />Status</span>
 <span className={`text-base font-bold mt-2 block capitalize ${memberFreezes.some(f => f.status === 'Approved') ? 'text-sky-600' : 'text-neutral-900'}`}>
  {memberFreezes.some(f => f.status === 'Approved') ? 'Frozen' : (activeMembership?.status || memberStatus)}
 </span>
 </div>

 {/* Days Left */}
 <div className="bg-neutral-50/40 border border-neutral-200/60 rounded-2xl p-4">
 <span className="text-[11px] text-neutral-500 flex items-center gap-1.5 uppercase tracking-wide"><Clock size={12} />Days Left</span>
 <span className="text-base font-bold text-neutral-900 mt-2 block">
 {remainingDaysText}
 </span>
 </div>

 {/* Attendance */}
 <div className="bg-neutral-50/40 border border-neutral-200/60 rounded-2xl p-4">
 <span className="text-[11px] text-neutral-500 flex items-center gap-1.5 uppercase tracking-wide"><TrendingUp size={12} />Visits (Mo.)</span>
 <span className="text-base font-bold text-neutral-900 mt-2 block">{attendanceLogs.length} sessions</span>
 </div>

 {/* Biometrics */}
 <div className="bg-neutral-50/40 border border-neutral-200/60 rounded-2xl p-4">
 <span className="text-[11px] text-neutral-500 flex items-center gap-1.5 uppercase tracking-wide"><Scale size={12} />Weight</span>
 <span className="text-base font-bold text-neutral-900 mt-2 block">
 {member.memberMeasurements && member.memberMeasurements.length > 0
 ? `${member.memberMeasurements[0].weight} kg`
 : 'N/A'}
 </span>
 </div>

 {/* Balance */}
 <div className="bg-neutral-50/40 border border-neutral-200/60 rounded-2xl p-4">
 <span className="text-[11px] text-neutral-500 flex items-center gap-1.5 uppercase tracking-wide"><DollarSign size={12} />Balance Due</span>
 <span className={`text-base font-bold mt-2 block ${outstandingBalance > 0 ? 'text-danger' : 'text-neutral-900'}`}>₹{outstandingBalance.toLocaleString()}</span>
 </div>

 {/* PT Sessions */}
 <div className="bg-neutral-50/40 border border-neutral-200/60 rounded-2xl p-4">
 <span className="text-[11px] text-neutral-500 flex items-center gap-1.5 uppercase tracking-wide"><Dumbbell size={12} />PT Sessions</span>
 <span className="text-base font-bold text-neutral-900 mt-2 block">6 of 12</span>
 </div>
 </div>

 {/* PROFILE CONTENT HUB & SNAPSHOTS LAYOUT */}
 <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

 {/* LEFT COLUMN: DETAIL TABS (75%) */}
 <div className="lg:col-span-3 space-y-6 flex flex-col">

 {/* TAB HEADERS */}
 <Tabs
 tabs={[
 { id: 'overview', label: 'Overview' },
 { id: 'memberships', label: 'Membership' },
 { id: 'attendance', label: 'Attendance' },
 { id: 'workouts', label: 'Training' },
 { id: 'diet-plans', label: 'Nutrition' },
 { id: 'measurements', label: 'Measurements' },
 { id: 'progress', label: 'Progress' },
 { id: 'billing', label: 'Payments' },
 { id: 'documents', label: 'Documents' },
 { id: 'activity-timeline', label: 'Timeline' },
 { id: 'notes', label: 'Notes' },
 { id: 'settings', label: 'Settings' }
 ].map(t => ({ ...t, disabled: !canViewTab(t.id), icon: canViewTab(t.id) ? undefined : Lock }))}
 activeId={activeTab}
 onChange={(id) => setActiveTab(id)}
 />

 {/* TAB PANEL RENDERER */}
 <div className="bg-neutral-50/10 border border-neutral-200/40 rounded-3xl p-6 flex-1 min-h-[500px]">

 {/* TAB 1: OVERVIEW */}
 {activeTab === 'overview' && (
 <div className="space-y-8">

 {/* Information Sections */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {/* Personal */}
 <div className="space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block border-b border-neutral-200 pb-2">Personal Information</span>
 <div className="space-y-2 text-xs">
 <div className="flex justify-between"><span className="text-neutral-600">Gender</span><span className="text-neutral-800 font-semibold">{genderLabel}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Birth Date</span><span className="text-neutral-800 font-mono">{member.dob ? new Date(member.dob).toLocaleDateString() : 'N/A'}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Age</span><span className="text-neutral-800 font-mono">{ageLabel} years</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Marital Status</span><span className="text-neutral-800">{ai.maritalStatus || 'Single'}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Occupation</span><span className="text-neutral-800">{ai.occupation || 'N/A'}</span></div>
 </div>
 </div>

 {/* Contact */}
 <div className="space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block border-b border-neutral-200 pb-2">Contact details</span>
 <div className="space-y-2 text-xs">
 <div className="flex justify-between"><span className="text-neutral-600">Phone Number</span><span className="text-neutral-800 font-mono">{member.phoneNumber}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Email Address</span><span className="text-neutral-800 font-mono">{ai.email || 'N/A'}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Address Line 1</span><span className="text-neutral-800">{ai.addressLine1 || 'N/A'}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">City / State</span><span className="text-neutral-800">{ai.city ? `${ai.city}, ${ai.state || ''}` : 'N/A'}</span></div>
 </div>
 </div>

 {/* Emergency */}
 <div className="space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block border-b border-neutral-200 pb-2">Emergency Contact</span>
 <div className="space-y-2 text-xs">
 <div className="flex justify-between"><span className="text-neutral-600">Name</span><span className="text-neutral-800 font-semibold">{ai.emergencyName || 'N/A'}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Relationship</span><span className="text-neutral-800">{ai.emergencyRelationship || 'N/A'}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Phone Line</span><span className="text-neutral-800 font-mono">{ai.emergencyPhone || 'N/A'}</span></div>
 </div>
 </div>

 {/* Goals & Medical */}
 <div className="space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block border-b border-neutral-200 pb-2">Goals & Medical History</span>
 <div className="space-y-2 text-xs">
 <div className="flex justify-between"><span className="text-neutral-600">Primary Goal</span><span className="text-danger font-semibold">{ai.fitnessGoal || 'General Fitness'}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Medical notes</span><span className="text-neutral-800 italic">{ai.medicalConditions || 'No registered conditions'}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Allergies</span><span className="text-neutral-800">{ai.allergies || 'None'}</span></div>
 </div>
 </div>
 </div>

 {/* STAFF NOTES SECTION */}
 <div className="border-t border-neutral-200/60 pt-6 space-y-4">
 <div className="flex justify-between items-center">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Staff Interaction Logs</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Confidential internal observations logged by coordinators, trainers, or dietitians.</p>
 </div>
 </div>

 {/* Add note input */}
 <form onSubmit={handleAddNote} className="space-y-3 bg-neutral-50/20 border border-neutral-200 rounded-2xl p-4">
 <div className="flex items-center gap-3">
 <select
 className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-[10px] text-neutral-700 focus:outline-none"
 value={noteType}
 onChange={e => setNoteType(e.target.value)}
 >
 <option value="General">General Note</option>
 <option value="Medical">Medical restriction</option>
 <option value="Trainer">Trainer comment</option>
 <option value="Dietitian">Dietitian comment</option>
 <option value="Reception">Reception comment</option>
 </select>
 <span className="text-[9px] text-neutral-500 font-mono">Posting as: {currentUser?.name || 'Staff Desk'}</span>
 </div>

 <textarea
 placeholder="Type details to log for this member..."
 rows={2}
 required
 className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-xs text-neutral-800 focus:outline-none"
 value={noteContent}
 onChange={e => setNoteContent(e.target.value)}
 />

 <div className="flex justify-end">
 <button
 type="submit"
 disabled={saving}
 className="px-4 py-2 bg-primary hover:bg-primary-hover text-neutral-900 text-[10px] font-bold rounded-lg transition"
 >
 {saving ? 'Logging...' : 'Post Log Entry'}
 </button>
 </div>
 </form>

 {/* Render notes list */}
 <div className="space-y-3">
 {notes.map((n: any) => (
 <div key={n.id} className="bg-neutral-50/30 border border-neutral-200/80 rounded-2xl p-4 space-y-2">
 <div className="flex justify-between items-center text-[10px]">
 <div className="flex items-center gap-2">
 <span className="font-bold text-neutral-800">{n.author}</span>
 <span className="text-neutral-500 font-mono">•</span>
 <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 capitalize font-mono text-[9px]">{n.role}</span>
 </div>
 <span className="text-neutral-500 font-mono">{n.timestamp}</span>
 </div>
 <p className="text-xs text-neutral-700 leading-relaxed">{n.content}</p>
 </div>
 ))}
 </div>

 </div>

 </div>
 )}

 {/* TAB 2: MEMBERSHIPS */}
 {activeTab === 'memberships' && (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Membership Agreement Timeline</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Active and past billing contracts registered for this profile.</p>
 </div>
 <button
 onClick={() => router.push(`/workspace/memberships/history?memberId=${id}`)}
 className="px-3.5 py-2 bg-danger hover:bg-red-600 text-neutral-900 text-[10px] font-bold rounded-xl transition shadow-md"
 >
 View Lifetime History
 </button>
 </div>

 <div className="overflow-x-auto border border-neutral-200/60 rounded-2xl">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-neutral-200/80 text-neutral-600 font-mono uppercase text-[9px] tracking-wider bg-neutral-50/20">
 <th className="py-3 px-4">Agreement Plan</th>
 <th className="py-3 px-4">Start Date</th>
 <th className="py-3 px-4">End Date</th>
 <th className="py-3 px-4">Status</th>
 <th className="py-3 px-4">Amount</th>
 <th className="py-3 px-4">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/30 font-mono">
 {memberships.map((m: any) => {
  const isFrozen = memberFreezes.some(f => f.memberMembershipId === m.id && f.status === 'Approved');
  const hasPendingFreeze = memberFreezes.some(f => f.memberMembershipId === m.id && f.status === 'Pending');
  return (
  <tr
   key={m.id}
   className="hover:bg-neutral-50/10"
  >
   <td className="py-3.5 px-4 font-sans font-semibold text-neutral-800 cursor-pointer" onClick={() => router.push(`/workspace/memberships/subscriptions/${m.id}`)}>{m.plan}</td>
   <td className="py-3.5 px-4 text-neutral-600">{m.start}</td>
   <td className="py-3.5 px-4 text-neutral-600">{m.end}</td>
   <td className="py-3.5 px-4">
   <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getStatusBadge(isFrozen ? 'frozen' : m.status)}`}>
    {isFrozen ? 'Frozen' : m.status}
   </span>
   </td>
   <td className="py-3.5 px-4 text-neutral-800 font-bold">₹{m.amount.toLocaleString()}</td>
   <td className="py-3.5 px-4">
   {canExecuteAction('freeze-membership') && (
    <>
    {m.status.toLowerCase() === 'active' && !isFrozen && !hasPendingFreeze && (
     <button
     onClick={() => openFreezeDrawer(m.id)}
     className="px-2.5 py-1 bg-sky-50 border border-sky-200 text-sky-600 text-[9px] font-bold rounded-lg hover:border-sky-300 transition flex items-center gap-1"
     >
     <Pause size={10} />
     Freeze
     </button>
    )}
    {hasPendingFreeze && (
     <span className="text-[9px] text-amber-600 font-bold font-mono">Pending Approval</span>
    )}
    {isFrozen && (
     <button
     onClick={() => router.push('/workspace/memberships/freeze')}
     className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-600 text-[9px] font-bold rounded-lg hover:border-emerald-300 transition"
     >
     Manage
     </button>
    )}
    </>
   )}
   </td>
  </tr>
  );
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* TAB 3: ATTENDANCE */}
 {activeTab === 'attendance' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Attendance & Physical Check-In Logs</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">Turnstile access tracking and frequency insights.</p>
 </div>

 {/* Styled Graphical Attendance Bar Chart */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block">Visit Frequency Trend (Last 7 Days)</span>

 <div className="h-24 flex items-end justify-between gap-4 pt-4 px-2">
 {visitFrequencyTrend.map((item, idx) => (
 <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer" title={item.label}>
 <div className="w-full bg-neutral-100 rounded-md h-16 relative overflow-hidden">
 <div
 style={{ height: `${(item.count / maxVisitCount) * 100}%` }}
 className="absolute bottom-0 left-0 right-0 bg-primary rounded-md transition-all duration-300"
 />
 </div>
 <span className="text-[9px] text-neutral-500 font-mono">{item.day}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Logs list */}
 <div className="space-y-3.5">
 <span className="text-[10px] text-neutral-500 font-mono uppercase block">Check-In Event Logs</span>
 <div className="space-y-2.5">
 {attendanceLogs.map((l: any, idx: number) => (
 <div key={idx} className="bg-neutral-50/30 border border-neutral-200/60 rounded-2xl p-4 flex justify-between items-center text-xs">
 <div className="flex items-center gap-3">
 <div className="w-2 h-2 rounded-full bg-success" />
 <div>
 <span className="font-semibold text-neutral-800 block">Check-in at {l.branch}</span>
 <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">{l.time}</span>
 </div>
 </div>
 <span className="text-neutral-600 font-mono">{l.date}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* TAB 4: BILLING */}
 {activeTab === 'billing' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Billing Statement & Ledger</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Check invoices, pending dues, or print invoice summaries.</p>
 </div>

 <div className="overflow-x-auto border border-neutral-200/60 rounded-2xl">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="border-b border-neutral-200/80 text-neutral-600 font-mono uppercase text-[9px] tracking-wider bg-neutral-50/20">
 <th className="py-3 px-4">Invoice Number</th>
 <th className="py-3 px-4">Due Date</th>
 <th className="py-3 px-4">Payment Status</th>
 <th className="py-3 px-4 text-right">Invoice Amount</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200/30 font-mono">
 {invoices.map((inv: any) => (
 <tr key={inv.id} className="hover:bg-neutral-50/10">
 <td className="py-3.5 px-4 font-semibold text-neutral-800">{inv.id}</td>
 <td className="py-3.5 px-4 text-neutral-600">{inv.dueDate}</td>
 <td className="py-3.5 px-4">
 <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${inv.status.toLowerCase() === 'paid'
 ? 'bg-success-light text-success border-green-200'
 : 'bg-danger-light text-danger border-red-200'
 }`}>
 {inv.status}
 </span>
 </td>
 <td className="py-3.5 px-4 text-right text-neutral-800 font-bold">${inv.amount.toFixed(2)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* TAB 5: WORKOUT PLANS */}
 {activeTab === 'workouts' && (
 <div className="space-y-6">
 
 {/* 5.1 Overview Sub-Navigation and Global Quick Actions Row */}
 <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-200/80 pb-3 gap-4">
 <Tabs
 scrollable={false}
 tabs={[
 { id: 'dashboard', label: 'Workout Dashboard', icon: BarChart3 },
 { id: 'calendar', label: 'Weekly Schedule', icon: Calendar },
 { id: 'history', label: 'Workout History & Timelines', icon: History },
 { id: 'analytics', label: 'PRs & Metrics', icon: Award }
 ]}
 activeId={workoutsSubTab}
 onChange={(id) => setWorkoutsSubTab(id as any)}
 />

 <div className="flex items-center gap-2 flex-wrap">
 <button
 type="button"
 onClick={() => {
 setWizardExercises([
 { name: 'Barbell Back Squat', sets: 4, reps: '8', rest: '90s', notes: 'Warmup sets first' },
 { name: 'Leg Extensions', sets: 3, reps: '12', rest: '60s', notes: '' },
 { name: 'Romanian Dumbbell Deadlift', sets: 4, reps: '10', rest: '90s', notes: 'Maintain neutral spine' }
 ]);
 setWizardSelectedProg(null);
 setWizardStep(1);
 setWizardOpen(true);
 }}
 className="flex items-center gap-1 px-3 py-1.5 bg-danger hover:bg-red-600 text-white text-[10px] font-bold rounded-lg cursor-pointer"
 >
 <Plus size={12} />
 <span>Assign Program</span>
 </button>
 
 <button
 type="button"
 onClick={() => showToast('Compiling printable workout sheets...', 'success')}
 className="p-1.5 bg-neutral-50 hover:bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-800 rounded-lg cursor-pointer"
 title="Print Workout Plan"
 >
 <FileSpreadsheet size={13} />
 </button>
 </div>
 </div>

 {/* 5.2 Empty state checker */}
 {workoutsList.length === 0 ? (
 <div className="p-16 text-center bg-neutral-50/10 border border-dashed border-neutral-200 rounded-3xl space-y-4">
 <Dumbbell className="w-10 h-10 text-neutral-400 mx-auto animate-pulse" />
 <div className="max-w-sm mx-auto space-y-2">
 <h4 className="text-xs font-bold text-neutral-700">No Program Active</h4>
 <p className="text-[10px] text-neutral-500 leading-relaxed">
 This member does not have an active fitness training cycle assigned. Create or assign one now.
 </p>
 <button
 type="button"
 onClick={() => { setWizardStep(1); setWizardOpen(true); }}
 className="mt-3 px-4 py-2 bg-danger hover:bg-red-600 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
 >
 Launch Assignment Wizard
 </button>
 </div>
 </div>
 ) : (
 <>
 {/* 5.3 VIEW A: OVERVIEW DASHBOARD SUB-TAB */}
 {workoutsSubTab === 'dashboard' && (
 <div className="space-y-6">
 
 {/* KPI Summary Cards Grid */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {[
 { label: 'Current Program', value: workoutsList[0]?.name || 'None', color: 'text-danger', sub: `Trainer: ${workoutsList[0]?.assignedBy || 'Unassigned'}` },
 { label: 'Program Progress', value: `${workoutsList[0]?.compRate || 0}%`, color: 'text-success', sub: 'Linear weekly schedule' },
 { label: 'Adherence Streak', value: '5 days active', color: 'text-primary', sub: 'Current consecutive days' },
 { label: 'Personal Records', value: '6 tracked Lifts', color: 'text-blue-400', sub: 'Last update: 2 days ago' }
 ].map((kpi, idx) => (
 <div key={idx} className="bg-neutral-50/40 border border-neutral-100 rounded-2xl p-4 flex flex-col justify-between">
 <div>
 <span className="block text-[8px] text-neutral-500 uppercase tracking-wider font-extrabold">{kpi.label}</span>
 <p className={`text-sm font-black ${kpi.color} mt-1.5 truncate`}>{kpi.value}</p>
 </div>
 <span className="text-[9px] text-neutral-400 block mt-2 border-t border-neutral-100/60 pt-1.5 font-medium">{kpi.sub}</span>
 </div>
 ))}
 </div>

 {/* Current Program Card details */}
 <div className="bg-white border border-neutral-200 rounded-3xl p-5 space-y-4">
 <div className="flex justify-between items-start border-b border-neutral-100 pb-3">
 <div>
 <span className="text-[8px] font-extrabold uppercase text-neutral-500">Active Workout Routine</span>
 <h4 className="text-xs font-black text-neutral-800 mt-1">{workoutsList[0]?.name}</h4>
 </div>
 <span className="text-[9px] font-mono font-bold text-danger bg-danger-light px-2.5 py-0.5 border border-red-200 rounded-lg">
 {workoutsList[0]?.compRate}% Progress
 </span>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-mono">
 <div><span className="text-neutral-500 block font-sans">Goal</span><span className="text-neutral-700 font-bold block mt-0.5">{workoutsList[0]?.goal || 'Hypertrophy'}</span></div>
 <div><span className="text-neutral-500 block font-sans">Difficulty</span><span className="text-neutral-700 font-bold block mt-0.5">{workoutsList[0]?.difficulty || 'Intermediate'}</span></div>
 <div><span className="text-neutral-500 block font-sans">Start Date</span><span className="text-neutral-700 block mt-0.5">{workoutsList[0]?.date || '2026-06-30'}</span></div>
 <div><span className="text-neutral-500 block font-sans">End Date</span><span className="text-neutral-700 block mt-0.5">2026-08-30</span></div>
 <div><span className="text-neutral-500 block font-sans">Assigned Days</span><span className="text-neutral-700 block mt-0.5 truncate">{workoutsList[0]?.weeks || 'Mon, Wed, Fri'}</span></div>
 </div>

 <div className="pt-2 border-t border-neutral-100 flex justify-end gap-2.5">
 <button
 type="button"
 onClick={() => {
 const activeProg = workoutsList[0];
 setWizardExercises(activeProg.exercises || []);
 setWizardWorkoutDays((activeProg.weeks || '').split(', '));
 setWizardSelectedProg(activeProg);
 setWizardStep(3);
 setWizardOpen(true);
 }}
 className="px-3.5 py-1.5 bg-neutral-50 border border-neutral-200 text-neutral-700 text-[10px] font-bold rounded-lg cursor-pointer"
 >
 Edit Assignment
 </button>
 <button
 type="button"
 onClick={async () => {
 const nextWorkouts = workoutsList.map((w: any, idx: number) => idx === 0 ? { ...w, status: 'Paused' } : w);
 try {
 await membersApi.update(id, { aiInsights: { ...ai, workoutsList: nextWorkouts } });
 showToast('Program paused successfully.');
 loadData();
 } catch (_) {}
 }}
 className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 text-neutral-600 text-[10px] font-bold rounded-lg cursor-pointer"
 >
 Pause
 </button>
 </div>
 </div>

 {/* Trainer visible notes and medical warnings */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 
 {/* Medical Restrictions Card */}
 <div className="bg-neutral-50/20 border border-amber-200 rounded-3xl p-5 space-y-3">
 <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
 <AlertTriangle size={13} className="text-amber-700" />
 <span>Medical Warnings & Restrictions</span>
 </h4>
 <div className="space-y-2">
 {medicalRestrictions.map((item, index) => (
 <div key={index} className="flex gap-2 items-start p-2.5 bg-warning-light border border-amber-200 rounded-xl text-[10px] text-amber-700 font-bold leading-normal">
 <AlertCircle size={12} className="shrink-0 mt-0.5" />
 <span>{item}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Trainer Visible / Public Notes box */}
 <div className="bg-white border border-neutral-200 rounded-3xl p-5 space-y-4">
 <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">Trainer Public Notes & Visible Tips</h4>
 <div className="space-y-3">
 <textarea
 value={trainerVisibleNote}
 onChange={e => setTrainerVisibleNote(e.target.value)}
 placeholder="Instructions visible to member mobile device app portal (e.g. Keep chest up during squats)..."
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-xs text-neutral-800 outline-none resize-none"
 rows={3}
 />
 <button
 type="button"
 onClick={async () => {
 if (!trainerVisibleNote.trim()) return;
 const newNote = {
 id: 'note-' + Date.now(),
 author: currentUser?.name || 'Trainer Staff',
 role: 'trainer',
 timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
 content: `[Workout Visible Note] ${trainerVisibleNote}`,
 type: 'Trainer'
 };
 try {
 await membersApi.update(id, { aiInsights: { ...ai, staffNotes: [newNote, ...notes] } });
 showToast('Public training note submitted.', 'success');
 setTrainerVisibleNote('');
 loadData();
 } catch (_) {}
 }}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 text-danger hover:text-danger text-[10px] font-bold rounded-lg cursor-pointer"
 >
 Save Public Note
 </button>
 </div>
 </div>

 </div>
 </div>
 )}

 {/* 5.4 VIEW B: SCHEDULE & WEEKLY CALENDAR SCHEDULE */}
 {workoutsSubTab === 'calendar' && (
 <div className="space-y-6">
 
 {/* Weekly Schedule Days Card */}
 <div className="bg-white border border-neutral-200 rounded-3xl p-5 space-y-4">
 <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600">Training Days Calendar (Current Week)</h4>
 
 <div className="grid grid-cols-7 gap-3 select-none">
 {[
 { day: 'Mon', label: 'Squat Power A', status: 'Completed' },
 { day: 'Tue', label: 'Push Strength B', status: 'Completed' },
 { day: 'Wed', label: 'Active Yoga Recovery', status: 'Rest' },
 { day: 'Thu', label: 'Thoracic Press C', status: 'Completed' },
 { day: 'Fri', label: 'Pull Weight Focus', status: 'Scheduled' },
 { day: 'Sat', label: 'LISS Run Cardio', status: 'Scheduled' },
 { day: 'Sun', label: 'Yoga Flexibility', status: 'Rest' }
 ].map((wDay, idx) => (
 <div key={idx} className="bg-neutral-50 border border-neutral-100 rounded-2xl p-3 flex flex-col justify-between items-center text-center h-28">
 <span className="text-[10px] text-neutral-500 font-extrabold uppercase">{wDay.day}</span>
 <span className="text-[9px] font-bold text-neutral-700 truncate max-w-[80px] my-2">{wDay.label}</span>
 <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
 wDay.status === 'Completed' ? 'bg-success-light text-success border-green-200' :
 wDay.status === 'Rest' ? 'bg-neutral-50 text-neutral-500 border-neutral-200' :
 'bg-blue-955 text-blue-450 border-blue-900/30'
 }`}>
 {wDay.status}
 </span>
 </div>
 ))}
 </div>
 </div>

 {/* Today's Workout Exercises details checklist */}
 <div className="bg-white border border-neutral-200 rounded-3xl p-5 space-y-4">
 <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
 <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">Active Workout Exercises Checklist</h4>
 <span className="text-[10px] text-neutral-500 font-semibold font-mono">Today: Squat Power A</span>
 </div>

 <div className="space-y-3">
 {(workoutsList[0]?.exercises || [
 { name: 'Barbell Back Squat', sets: 4, reps: '8', rest: '90s', notes: 'Warmup sets first' },
 { name: 'Leg Extensions', sets: 3, reps: '12', rest: '60s', notes: '' },
 { name: 'Romanian Dumbbell Deadlift', sets: 4, reps: '10', rest: '90s', notes: 'Maintain neutral spine' }
 ]).map((ex: any, idx: number) => (
 <div key={idx} className="bg-neutral-50/40 border border-neutral-100 rounded-2xl p-4.5 flex justify-between items-center gap-3">
 <div>
 <h5 className="text-xs font-extrabold text-neutral-800">{ex.name}</h5>
 <p className="text-[10px] text-neutral-500 mt-1 font-mono">{ex.sets} sets × {ex.reps} reps • Rest: {ex.rest || '60s'}</p>
 {ex.notes && <p className="text-[9px] text-danger italic mt-0.5">Instruction: {ex.notes}</p>}
 </div>
 <div className="flex items-center gap-3">
 <button
 type="button"
 onClick={() => showToast(`Exercise ${ex.name} marked complete.`, 'success')}
 className="p-1.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-lg cursor-pointer"
 >
 <Check size={12} />
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>

 </div>
 )}

 {/* 5.5 VIEW C: WORKOUT HISTORY & PROGRAM TIMELINES */}
 {workoutsSubTab === 'history' && (
 <div className="space-y-6">
 
 {/* History list table */}
 <div className="bg-white border border-neutral-200 rounded-3xl p-5 space-y-4">
 <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">Fitness Programs Assignment Logs</h4>
 
 <div className="overflow-x-auto border border-neutral-100 rounded-2xl">
 <table className="w-full text-left border-collapse text-xs">
 <thead>
 <tr className="bg-neutral-50 text-neutral-500 uppercase text-[9px] tracking-wider font-extrabold border-b border-neutral-100 select-none">
 <th className="p-3">Program Name</th>
 <th className="p-3">Trainer Coordinator</th>
 <th className="p-3">Assigned Date</th>
 <th className="p-3 font-mono">Completion Rate</th>
 <th className="p-3 text-right">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100 text-neutral-700 font-medium">
 {workoutsList.map((w: any) => (
 <tr key={w.id} className="hover:bg-neutral-50/10">
 <td className="p-3 font-extrabold text-neutral-800">{w.name}</td>
 <td className="p-3 text-neutral-600">{w.assignedBy}</td>
 <td className="p-3 font-mono">{w.date}</td>
 <td className="p-3 font-mono text-success">{w.compRate || 0}%</td>
 <td className="p-3 text-right">
 <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded border ${
 w.status === 'Paused' ? 'bg-warning text-amber-700 border-amber-200' : 'bg-success-light text-success border-green-200'
 }`}>
 {w.status || 'Active'}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Chronological training timeline events */}
 <div className="bg-white border border-neutral-200 rounded-3xl p-5 space-y-4">
 <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">Client Training Timeline Lifecycle</h4>
 
 <div className="relative border-l border-neutral-200 ml-3 pl-6 space-y-4 py-1">
 {[
 { date: '2026-06-30', event: 'Training Program Active Cycle Started', desc: 'Assigned by Personal Trainer Marcus Vance' },
 { date: '2026-06-28', event: 'Trainer Evaluation Feedback Submitted', desc: 'Approved deadlift set loads, increased targets by 2.5kg' },
 { date: '2026-06-25', event: 'Workout Session Completed', desc: 'Finished: Chest Core Blast. Set adherence 90%' },
 { date: '2026-06-20', event: 'Client Biometrics Intake logged', desc: 'Weight recorded: 78.5kg. Muscle volume increase verified' }
 ].map((evt, idx) => (
 <div key={idx} className="relative">
 <div className="absolute left-[-29px] top-1 w-2 h-2 rounded-full bg-danger border border-neutral-100" />
 <span className="text-[9px] font-mono text-neutral-500">{evt.date}</span>
 <p className="text-[11px] font-extrabold text-neutral-800 mt-0.5">{evt.event}</p>
 <p className="text-[10px] text-neutral-500 mt-0.5">{evt.desc}</p>
 </div>
 ))}
 </div>
 </div>

 </div>
 )}

 {/* 5.6 VIEW D: DYNAMIC PRS & METRICS TRACKING */}
 {workoutsSubTab === 'analytics' && (
 <div className="space-y-6">
 
 {/* Personal Records lifting targets */}
 <div className="bg-white border border-neutral-200 rounded-3xl p-5 space-y-4">
 <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">Personal Best Performance Lifts (PRs)</h4>
 
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {[
 { exercise: 'Bench Press', pb: '100 kg', date: '2026-06-15', diff: '+5kg gain' },
 { exercise: 'Back Squat', pb: '140 kg', date: '2026-06-20', diff: '+10kg gain' },
 { exercise: 'Deadlift', pb: '180 kg', date: '2026-06-25', diff: '+15kg gain' },
 { exercise: 'Pull-Ups Max Reps', pb: '15 reps', date: '2026-06-10', diff: '+2 reps' },
 { exercise: '5k Running', pb: '22:15 mins', date: '2026-06-08', diff: '-45s time' },
 { exercise: 'Plank Duration', pb: '4:30 mins', date: '2026-06-18', diff: '+30s duration' }
 ].map((pr, idx) => (
 <div key={idx} className="p-4 bg-neutral-50/40 border border-neutral-100 hover:border-neutral-200 rounded-2xl flex justify-between items-center gap-3">
 <div>
 <span className="block text-[8px] font-extrabold uppercase text-neutral-500">{pr.exercise}</span>
 <span className="text-xs font-black text-neutral-800 mt-1 block">{pr.pb}</span>
 <span className="text-[9px] text-neutral-400 block mt-0.5 font-semibold">Achieved: {pr.date}</span>
 </div>
 <span className="text-[9px] font-bold text-success bg-success-light px-2 py-0.5 rounded border border-green-200">
 {pr.diff}
 </span>
 </div>
 ))}
 </div>
 </div>

 {/* Progress Metrics & correlations stats */}
 <div className="bg-white border border-neutral-200 rounded-3xl p-5 space-y-4">
 <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">Coaching Metrics & Adherence Analytics</h4>
 
 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
 {[
 { label: 'Workouts Completed', value: '24 sessions' },
 { label: 'Total Volume Lifted', value: '98,400 kg' },
 { label: 'Active Muscle Zones', value: 'Chest, Quads, Back' },
 { label: 'Average Heart Rate', value: '142 bpm' },
 { label: 'Correlation Score', value: '94% Adherence' }
 ].map((stat, idx) => (
 <div key={idx} className="bg-neutral-50/40 border border-neutral-100 rounded-xl p-3.5 text-center">
 <span className="block text-[8px] uppercase tracking-wider text-neutral-500 font-bold">{stat.label}</span>
 <span className="text-xs font-black text-neutral-800 mt-1 block">{stat.value}</span>
 </div>
 ))}
 </div>
 </div>

 </div>
 )}
 </>
 )}

 {/* 5.7 WORKOUT ASSIGNMENT WIZARD DIALOG POPUP MODAL */}
 {wizardOpen && (
 <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fade-in text-xs select-none">
 <div className="w-full max-w-xl bg-white border border-neutral-200 p-6 rounded-3xl space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin">
 
 {/* Close Header */}
 <div className="flex justify-between items-center border-b border-neutral-100 pb-3.5">
 <div>
 <span className="text-[8px] font-extrabold uppercase tracking-widest text-danger">Step {wizardStep} of 4</span>
 <h3 className="text-sm font-black text-neutral-900 mt-1">Assign Workout Routine</h3>
 </div>
 <button
 type="button"
 onClick={() => { setWizardOpen(false); setWizardStep(1); }}
 className="p-1.5 bg-neutral-50 border border-neutral-100 text-neutral-500 hover:text-neutral-800 rounded-xl cursor-pointer"
 >
 <X size={16} />
 </button>
 </div>

 {/* STEP 1: CHOOSE SOURCE */}
 {wizardStep === 1 && (
 <div className="space-y-4">
 <span className="block text-[10px] text-neutral-500 uppercase tracking-wider font-extrabold">Choose Programs Repository Source</span>
 <div className="grid grid-cols-2 gap-3">
 {[
 { name: 'Official Programs', desc: 'Curated standard GymFlow training plans' },
 { name: 'Organization Programs', desc: 'Shared routines templates' },
 { name: 'Workout Templates', desc: 'Single training session layouts' },
 { name: 'Client Favorites', desc: 'Highly repetitive client favorites' }
 ].map((src, i) => (
 <div
 key={i}
 onClick={() => {
 setWizardSource(src.name);
 setWizardStep(2);
 }}
 className={`p-4 border rounded-2xl text-left cursor-pointer transition ${
 wizardSource === src.name ? 'bg-danger-light border-red-200' : 'bg-neutral-50/40 border-neutral-100 hover:border-neutral-200'
 }`}
 >
 <span className="block font-extrabold text-neutral-800">{src.name}</span>
 <span className="block text-[9px] text-neutral-500 mt-1 leading-normal">{src.desc}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* STEP 2: PROGRAM SELECTION LIST */}
 {wizardStep === 2 && (
 <div className="space-y-4">
 <div className="flex gap-2">
 <input
 type="text"
 value={wizardSearch}
 onChange={e => setWizardSearch(e.target.value)}
 placeholder="Search templates library..."
 className="flex-1 bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 outline-none text-neutral-800"
 />
 </div>

 <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
 {[
 { name: '4 Week Beginner Strength Starter', difficulty: 'Beginner', goal: 'Strength', weeks: 'Mon, Wed, Fri', source: 'Official Programs' },
 { name: '8 Week Fat Loss & HIIT Engine', difficulty: 'Intermediate', goal: 'Fat Loss', weeks: 'Mon, Tue, Thu, Fri', source: 'Organization Programs' },
 { name: '12 Week Hypertrophy Masterclass', difficulty: 'Advanced', goal: 'Hypertrophy', weeks: 'Mon, Wed, Fri', source: 'Workout Templates' },
 { name: 'Yoga Stretch & Thoracic Flow', difficulty: 'Beginner', goal: 'Mobility', weeks: 'Sat, Sun', source: 'Client Favorites' }
 ].filter(item => {
 return item.name.toLowerCase().includes(wizardSearch.toLowerCase());
 }).map((prog, idx) => (
 <div
 key={idx}
 onClick={() => {
 setWizardSelectedProg(prog);
 setWizardStep(3);
 }}
 className="p-3.5 bg-neutral-50/40 border border-neutral-100 hover:border-neutral-200 rounded-2xl flex justify-between items-center cursor-pointer text-left"
 >
 <div>
 <h4 className="font-extrabold text-neutral-800">{prog.name}</h4>
 <span className="text-[9px] text-neutral-500 font-mono mt-1 block">Goal: {prog.goal} • Difficulty: {prog.difficulty}</span>
 </div>
 <ChevronRight className="w-4 h-4 text-neutral-500" />
 </div>
 ))}
 </div>

 <button
 type="button"
 onClick={() => setWizardStep(1)}
 className="w-full py-2.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-600 font-bold rounded-xl cursor-pointer"
 >
 Back to Source Selection
 </button>
 </div>
 )}

 {/* STEP 3: CUSTOMIZE EXERCISES */}
 {wizardStep === 3 && (
 <div className="space-y-4">
 <span className="block text-[10px] text-neutral-500 uppercase tracking-wider font-extrabold">Customize Routines & Instructions</span>

 <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
 {wizardExercises.map((ex, idx) => (
 <div key={idx} className="p-3 bg-neutral-50/60 border border-neutral-100 rounded-2xl space-y-2 text-left relative">
 <button
 type="button"
 onClick={() => setWizardExercises(wizardExercises.filter((_, i) => i !== idx))}
 className="absolute top-2.5 right-2.5 text-neutral-500 hover:text-danger"
 >
 <Trash2 size={13} />
 </button>
 
 <h4 className="font-extrabold text-neutral-700 text-xs">{ex.name}</h4>
 
 <div className="grid grid-cols-3 gap-2">
 <input
 type="number"
 value={ex.sets}
 onChange={e => {
 const next = [...wizardExercises];
 next[idx].sets = parseInt(e.target.value) || 3;
 setWizardExercises(next);
 }}
 placeholder="Sets"
 className="bg-neutral-50 border border-neutral-200 px-2 py-1.5 rounded text-center text-neutral-800"
 />
 <input
 type="text"
 value={ex.reps}
 onChange={e => {
 const next = [...wizardExercises];
 next[idx].reps = e.target.value;
 setWizardExercises(next);
 }}
 placeholder="Reps"
 className="bg-neutral-50 border border-neutral-200 px-2 py-1.5 rounded text-center text-neutral-800"
 />
 <input
 type="text"
 value={ex.rest}
 onChange={e => {
 const next = [...wizardExercises];
 next[idx].rest = e.target.value;
 setWizardExercises(next);
 }}
 placeholder="Rest"
 className="bg-neutral-50 border border-neutral-200 px-2 py-1.5 rounded text-center text-neutral-800"
 />
 </div>
 </div>
 ))}

 <button
 type="button"
 onClick={() => {
 setWizardExercises([
 ...wizardExercises,
 { name: 'Dumbbell Hammer Curls', sets: 3, reps: '12', rest: '60s', notes: 'Maintain strict biceps control' }
 ]);
 }}
 className="w-full py-2 bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-danger text-[10px] font-bold rounded-xl cursor-pointer"
 >
 + Add Exercise to Program
 </button>
 </div>

 <div className="grid grid-cols-2 gap-3 pt-2">
 <button
 type="button"
 onClick={() => setWizardStep(2)}
 className="py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-600 font-bold rounded-xl cursor-pointer"
 >
 Back
 </button>
 <button
 type="button"
 onClick={() => setWizardStep(4)}
 className="py-2.5 bg-danger hover:bg-red-600 text-white font-bold rounded-xl cursor-pointer"
 >
 Next to Summary
 </button>
 </div>
 </div>
 )}

 {/* STEP 4: ASSIGNMENT REVIEW */}
 {wizardStep === 4 && (
 <div className="space-y-4">
 <span className="block text-[10px] text-neutral-500 uppercase tracking-wider font-extrabold">Final Review & Confirmation</span>

 <div className="p-4 bg-neutral-50/60 border border-neutral-100 rounded-2xl space-y-3 text-left">
 <p><span className="text-neutral-500">Program:</span> <span className="font-extrabold text-neutral-800">{wizardSelectedProg?.name || 'Custom Routine plan'}</span></p>
 <p><span className="text-neutral-500">Goal / Target:</span> <span className="font-bold text-neutral-700">{wizardSelectedProg?.goal || 'General Hypertrophy'}</span></p>
 <p><span className="text-neutral-500">Exercises count:</span> <span className="font-mono text-neutral-700">{wizardExercises.length} Exercises customized</span></p>
 <p><span className="text-neutral-500">Weekly schedule days:</span> <span className="text-neutral-700 font-mono">{wizardWorkoutDays.join(', ')}</span></p>
 </div>

 <div className="space-y-1">
 <label className="block text-[8px] text-neutral-500 font-extrabold uppercase text-left mb-1">Trainer recommendations / schedule comments</label>
 <input
 type="text"
 value={wizardTrainerNotes}
 onChange={e => setWizardTrainerNotes(e.target.value)}
 placeholder="e.g. Focus on compound progressive loads..."
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2.5 outline-none text-neutral-800"
 />
 </div>

 <div className="grid grid-cols-2 gap-3 pt-2">
 <button
 type="button"
 onClick={() => setWizardStep(3)}
 className="py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-600 font-bold rounded-xl cursor-pointer"
 >
 Back
 </button>
 <button
 type="button"
 onClick={handleAssignProgramWizardSubmit}
 disabled={saving}
 className="py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg cursor-pointer"
 >
 {saving ? 'Assigning...' : 'Confirm Program Assignment'}
 </button>
 </div>
 </div>
 )}

 </div>
 </div>
 )}

 </div>
 )}


 {/* TAB 6: DIET PLANS */}
 {activeTab === 'diet-plans' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Active Dietary Regimens</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Calorie targets and macro breakdown assigned by dietitian staff.</p>
 </div>

 {dietsList.length === 0 ? (
 <div className="p-12 text-center bg-neutral-50/10 border border-dashed border-neutral-200 rounded-2xl">
 <span className="text-xs text-neutral-500 block">No dietary programs assigned.</span>
 <button
 onClick={() => { setDrawerAction('assign-diet'); setShowDrawer(true); }}
 className="mt-4 px-4 py-2 bg-neutral-50 border border-neutral-200 text-danger text-xs rounded-xl hover:bg-neutral-50 transition"
 >
 Assign First Diet Plan
 </button>
 </div>
 ) : (
 <div className="space-y-4">
 {dietsList.map((d: any) => (
 <div key={d.id} className="bg-neutral-50/30 border border-neutral-200 rounded-2xl p-5 space-y-4">
 <div>
 <span className="text-base font-bold text-neutral-800">{d.name}</span>
 <span className="text-[10px] text-neutral-500 font-mono block mt-1">Assigned by: {d.assignedBy} • Date: {d.date}</span>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono">
 <div className="bg-white rounded-xl p-3 border border-neutral-200">
 <span className="text-[9px] text-neutral-500 uppercase block font-sans">Calories</span>
 <span className="text-sm font-bold text-neutral-800 mt-1 block">{d.calories} kcal</span>
 </div>
 <div className="bg-white rounded-xl p-3 border border-neutral-200">
 <span className="text-[9px] text-neutral-500 uppercase block font-sans">Protein</span>
 <span className="text-sm font-bold text-neutral-800 mt-1 block">180 g</span>
 </div>
 <div className="bg-white rounded-xl p-3 border border-neutral-200">
 <span className="text-[9px] text-neutral-500 uppercase block font-sans">Carbohydrates</span>
 <span className="text-sm font-bold text-neutral-800 mt-1 block">150 g</span>
 </div>
 <div className="bg-white rounded-xl p-3 border border-neutral-200">
 <span className="text-[9px] text-neutral-500 uppercase block font-sans">Fat</span>
 <span className="text-sm font-bold text-neutral-800 mt-1 block">85 g</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* TAB 7: MEASUREMENTS */}
 {activeTab === 'measurements' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Biometric Tracker & Measurements</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Physical transformation tracking logs.</p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Values card */}
 <div className="bg-neutral-50/30 border border-neutral-200 rounded-2xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono block uppercase border-b border-neutral-200 pb-2">Latest Biometrics</span>
 <div className="grid grid-cols-2 gap-4 text-xs font-mono">
 <div><span className="text-neutral-600 block font-sans">Height</span><span className="text-neutral-800 font-bold block mt-1">{latestMeasurement?.height || '--'} cm</span></div>
 <div><span className="text-neutral-600 block font-sans">Weight</span><span className="text-neutral-800 font-bold block mt-1">{latestMeasurement?.weight || '--'} kg</span></div>
 <div><span className="text-neutral-600 block font-sans">Body Fat %</span><span className="text-neutral-800 font-bold block mt-1">{latestMeasurement?.bodyFatPercentage || '--'}%</span></div>
 <div><span className="text-neutral-600 block font-sans">Waist</span><span className="text-neutral-800 font-bold block mt-1">{bodyDimensions.waist || '--'} cm</span></div>
 <div><span className="text-neutral-600 block font-sans">Chest</span><span className="text-neutral-800 font-bold block mt-1">{bodyDimensions.chest || '--'} cm</span></div>
 <div><span className="text-neutral-600 block font-sans">Arm</span><span className="text-neutral-800 font-bold block mt-1">{bodyDimensions.arm || '--'} cm</span></div>
 </div>
 </div>

 {/* Weight progress simulated chart */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
 <span className="text-[10px] text-neutral-500 font-mono block uppercase">Weight progression curve</span>

 {weightCurveData.length === 0 ? (
 <div className="h-28 flex items-center justify-center text-neutral-500 text-[10px] italic">
 No weight logs available for progression tracking.
 </div>
 ) : (
 <div className="h-28 flex items-end justify-between gap-6 pt-4 px-4 relative">
 {/* Grid lines */}
 <div className="absolute inset-x-0 bottom-4 border-b border-neutral-200/80" />
 <div className="absolute inset-x-0 bottom-12 border-b border-neutral-200/40" />
 <div className="absolute inset-x-0 bottom-20 border-b border-neutral-200/20" />

 {weightCurveData.map((item, idx) => (
 <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 z-10">
 <span className="text-[8px] text-danger font-semibold">{item.val} kg</span>
 <div className="w-2 h-2 rounded-full bg-danger border border-neutral-100" />
 <span className="text-[8px] text-neutral-500 mt-1 font-mono uppercase">{item.date}</span>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* TAB 8: DOCUMENTS */}
 {activeTab === 'documents' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Waivers & ID Documents</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Simulated storage for required physical files.</p>
 </div>

 {(() => {
 const documents = member?.memberDocuments || [];
 if (documents.length === 0) {
 return (
 <div className="p-12 text-center bg-neutral-50/10 border border-dashed border-neutral-200 rounded-2xl">
 <span className="text-xs text-neutral-500 block font-mono">No documents uploaded yet.</span>
 <button
 onClick={() => { setDrawerAction('upload-document'); setShowDrawer(true); }}
 className="mt-4 px-4 py-2 bg-neutral-50 border border-neutral-200 text-danger text-xs rounded-xl hover:bg-neutral-50 transition"
 >
 Upload First Document
 </button>
 </div>
 );
 }
 return (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {documents.map((doc: any, idx: number) => {
 let title = 'Other Document';
 let desc = 'Additional verified documentation.';
 if (doc.documentType === 'ID_PROOF') {
 title = 'ID Proof Document';
 desc = 'Government photo identification.';
 } else if (doc.documentType === 'MEDICAL' || doc.documentType === 'MEDICAL_CERT') {
 title = 'Medical Clearance Certificate';
 desc = 'Required clearance note for workouts.';
 } else if (doc.documentType === 'CONSENT' || doc.documentType === 'CONSENT_WAIVER') {
 title = 'Waiver & Liability Release';
 desc = 'Signed liability form on joining.';
 }

 const fileName = doc.url.split('/').pop() || 'document.pdf';

 return (
 <div key={doc.id || idx} className="bg-neutral-50/30 border border-neutral-200 rounded-2xl p-4 flex items-start gap-4">
 <div className="p-3 bg-white border border-neutral-200 text-danger rounded-xl">
 <FileText size={20} />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex justify-between items-start gap-2">
 <span className="text-xs font-bold text-neutral-800 block truncate">{title}</span>
 <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider shrink-0 ${doc.status?.toLowerCase() === 'active'
 ? 'bg-success-light text-success border-green-200'
 : 'bg-neutral-100/20 text-neutral-600 border-neutral-200/30'
 }`}>
 {doc.status || 'Active'}
 </span>
 </div>
 <span className="text-[10px] text-neutral-600 block mt-1">{desc}</span>
 <span className="text-[9px] text-neutral-500 font-mono mt-2 block italic truncate" title={fileName}>{fileName}</span>

 <div className="flex gap-2 mt-4 pt-2 border-t border-neutral-200/50">
 <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1 bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-800 rounded-md transition" title="Download"><Download size={12} /></a>
 <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1 bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-800 rounded-md transition" title="Preview"><Eye size={12} /></a>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 );
 })()}
 </div>
 )}

 {/* TAB 9: TIMELINE */}
 {activeTab === 'activity-timeline' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Audit & Lifecycle Timeline</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Chronological trail of updates and actions registered for this member.</p>
 </div>

 {paginatedTimeline.length === 0 ? (
 <div className="p-8 text-center bg-neutral-50/10 border border-dashed border-neutral-200 rounded-2xl">
 <span className="text-xs text-neutral-500 block font-mono">No activity events logged yet.</span>
 </div>
 ) : (
 <>
 <div className="relative border-l border-neutral-200/80 ml-4 pl-6 space-y-6 py-4">
 {paginatedTimeline.map((t: any) => (
 <div key={t.id} className="relative">
 {/* Timeline dot */}
 <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-danger border border-neutral-100" />

 <div className="space-y-1 text-xs font-mono">
 <span className="font-bold text-neutral-800 block font-sans">{t.type}</span>
 <span className="text-[10px] text-neutral-500 block">{t.timestamp} • Actioned by: {t.user}</span>
 </div>
 </div>
 ))}
 </div>

 {totalTimelinePages > 1 && (
 <div className="flex items-center justify-between border-t border-neutral-200 pt-4 mt-2 text-xs font-mono">
 <button
 type="button"
 disabled={timelinePage === 1}
 onClick={() => setTimelinePage(prev => Math.max(1, prev - 1))}
 className="px-3 py-1 bg-neutral-50 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition"
 >
 Previous
 </button>
 <span className="text-neutral-500">
 Page {timelinePage} of {totalTimelinePages}
 </span>
 <button
 type="button"
 disabled={timelinePage === totalTimelinePages}
 onClick={() => setTimelinePage(prev => Math.min(totalTimelinePages, prev + 1))}
 className="px-3 py-1 bg-neutral-50 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition"
 >
 Next
 </button>
 </div>
 )}
 </>
 )}
 </div>
 )}

 {/* TAB 10: PROGRESS */}
 {activeTab === 'progress' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Athlete Progress & Milestones Tracker</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Historical physical progression and target achievements.</p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Goal completion */}
 <div className="bg-white border border-neutral-200 rounded-3xl p-5 space-y-4">
 <span className="block text-[10px] text-neutral-500 font-mono uppercase">Goal Completion Rate</span>
 <div className="space-y-4">
 <div>
 <div className="flex justify-between text-xs text-neutral-600 mb-1">
 <span>Target Weight (Lose 6kg)</span>
 <span className="font-bold text-danger">80% Met</span>
 </div>
 <div className="h-2 bg-neutral-50 rounded-full overflow-hidden">
 <div className="h-full bg-primary" style={{ width: '80%' }} />
 </div>
 </div>
 <div>
 <div className="flex justify-between text-xs text-neutral-600 mb-1">
 <span>Consistency (16 Workouts/mo)</span>
 <span className="font-bold text-success">100% Met</span>
 </div>
 <div className="h-2 bg-neutral-50 rounded-full overflow-hidden">
 <div className="h-full bg-success" style={{ width: '100%' }} />
 </div>
 </div>
 </div>
 </div>

 {/* Achievements */}
 <div className="bg-white border border-neutral-200 rounded-3xl p-5 space-y-4">
 <span className="block text-[10px] text-neutral-500 font-mono uppercase">Recent Athlete Milestones</span>
 <div className="grid grid-cols-2 gap-3">
 {[
 { title: '🔥 5 Day Streak', desc: 'Trained Mon-Fri consecutively' },
 { title: '💪 squat PR (+10kg)', desc: 'Squatted 140kg barbell' },
 { title: '🌟 perfect week', desc: '100% workout adherence rate' },
 { title: '⚡ calorie burner', desc: 'Burned 4.2k kcal in 7 days' }
 ].map((ach, idx) => (
 <div key={idx} className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl">
 <span className="block font-black text-neutral-800 text-xs">{ach.title}</span>
 <span className="block text-[9px] text-neutral-500 mt-1">{ach.desc}</span>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Transformation photos placeholder */}
 <div className="bg-white border border-neutral-200 rounded-3xl p-5 space-y-4">
 <span className="block text-[10px] text-neutral-500 uppercase tracking-wider font-extrabold">Transformation Progress Photos</span>
 <div className="grid grid-cols-3 gap-4">
 {[
 { label: 'Week 1 (Intake)', date: '2026-06-01' },
 { label: 'Week 4', date: '2026-06-15' },
 { label: 'Week 8 (Latest)', date: '2026-06-30' }
 ].map((img, idx) => (
 <div key={idx} className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4.5 text-center flex flex-col justify-center items-center gap-2 h-44 cursor-pointer hover:border-neutral-200 transition">
 <Camera size={24} className="text-neutral-400 mb-2" />
 <span className="block text-xs font-bold text-neutral-700">{img.label}</span>
 <span className="block text-[9px] text-neutral-500 font-mono">{img.date}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* TAB 11: NOTES */}
 {activeTab === 'notes' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Operational & Staff Notes Tab</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Submit receptionist, medical, trainer, or dietitian private logs.</p>
 </div>

 <div className="bg-white border border-neutral-200 rounded-3xl p-5 space-y-4">
 <form onSubmit={handleAddNote} className="space-y-4">
 <div className="flex gap-4">
 <div className="flex-1 space-y-1">
 <label className="text-[9px] text-neutral-500 font-mono uppercase font-bold">Note Category Type</label>
 <select
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2.5 text-xs text-neutral-800 focus:outline-none"
 value={noteType}
 onChange={e => setNoteType(e.target.value)}
 >
 <option value="General">General Note</option>
 <option value="Trainer">Trainer Instruction</option>
 <option value="Medical">Medical Limitation</option>
 <option value="Dietitian">Dietitian Log</option>
 <option value="Reception">Reception Desk Alert</option>
 </select>
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[9px] text-neutral-500 font-mono uppercase font-bold">Private / Visible Content</label>
 <textarea
 rows={4}
 placeholder="Write note content here..."
 className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl p-4 text-xs text-neutral-900 outline-none"
 value={noteContent}
 onChange={e => setNoteContent(e.target.value)}
 />
 </div>

 <button
 type="submit"
 disabled={saving || !noteContent.trim()}
 className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition cursor-pointer"
 >
 {saving ? 'Saving...' : 'Post Staff Note'}
 </button>
 </form>
 </div>

 <div className="space-y-3">
 {notes.map((n: any) => (
 <div key={n.id} className="bg-white border border-neutral-200 rounded-2xl p-4 flex justify-between items-start gap-4">
 <div>
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-neutral-800">{n.author}</span>
 <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-neutral-50 border border-neutral-100 text-neutral-500">
 {n.type || 'Staff'}
 </span>
 </div>
 <p className="text-xs text-neutral-700 mt-2 leading-relaxed whitespace-pre-wrap">{n.content}</p>
 </div>
 <span className="text-[9px] font-mono text-neutral-500">{n.timestamp}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* TAB 12: SETTINGS */}
 {activeTab === 'settings' && (
 <div className="space-y-6">
 <div>
 <h3 className="text-sm font-bold text-neutral-800">Member Preferences & Access Configurations</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Toggle visibilities and trainer operational restrictions.</p>
 </div>

 <div className="bg-white border border-neutral-200 rounded-3xl p-6 space-y-6">
 
 {/* Preferences Toggles */}
 <div className="space-y-4">
 <span className="block text-[10px] text-neutral-500 uppercase tracking-wider font-extrabold pb-2 border-b border-neutral-100">Visibility Preferences</span>
 {[
 { title: 'Workout Schedule Visible to Member Mobile Portal', desc: 'Allows member to inspect their weekly calendar on native React Native mobile screens' },
 { title: 'Diet Plan Macro Visible', desc: 'Toggles macro carbohydrate / protein values display on mobile feed' },
 { title: 'Biometrics Progress Charts Private', desc: 'Locks measurement metrics logs to Coordinator Staff only' }
 ].map((item, idx) => (
 <div key={idx} className="flex justify-between items-center gap-6 py-2.5">
 <div>
 <span className="text-xs font-bold text-neutral-800 block">{item.title}</span>
 <span className="text-[10px] text-neutral-500 mt-0.5 block leading-normal">{item.desc}</span>
 </div>
 <div className="w-8 h-4 bg-danger rounded-full cursor-pointer relative flex items-center px-0.5 shadow-inner">
 <div className="w-3.5 h-3 bg-white rounded-full absolute right-0.5 shadow-md" />
 </div>
 </div>
 ))}
 </div>

 </div>
 </div>
 )}
 {/* END OF TABS RENDER */}

 </div>

 </div>

 {/* RIGHT COLUMN: MEMBER 360 OPERATIONAL SIDEBAR (25%) */}
 <div className="space-y-6">

 {/* SIDEBAR CARD 1: CURRENT ATTENDANCE & APPOINTMENTS */}
 <div className="bg-neutral-50/40 border border-neutral-200/60 rounded-3xl p-5 space-y-4">
 <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
 <div>
 <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Attendance Status</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Live check-in and clinic visits.</p>
 </div>
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
 todayCheckInText === 'Logged' ? 'bg-success-light text-success border border-green-200' : 'bg-neutral-50 text-neutral-500 border border-neutral-100'
 }`}>
 {todayCheckInText}
 </span>
 </div>

 <div className="space-y-2.5 text-xs">
 <div className="flex justify-between"><span className="text-neutral-600">Checked In At</span><span className="text-neutral-800 font-semibold font-mono">{todayCheckInTime}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Last Visit</span><span className="text-neutral-800 font-mono">{attendanceLogs[0]?.date || 'N/A'}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600">Consistency Score</span><span className="text-success font-bold font-mono">{healthScoreText}/100</span></div>
 </div>

 {/* Upcoming Appointment */}
 <div className="bg-neutral-50/60 border border-neutral-200 rounded-2xl p-3.5 space-y-2">
 <span className="text-[10px] text-neutral-500 uppercase tracking-wide block">Upcoming Appointment</span>
 <div className="flex items-start gap-2.5">
 <Calendar size={13} className="text-danger shrink-0 mt-0.5" />
 <div>
 <span className="block text-xs font-bold text-neutral-800">1-on-1 PT Coaching Session</span>
 <span className="block text-[10px] text-neutral-500 mt-0.5 font-mono">Today, 04:30 PM with {ai.assignedTrainerName || 'Trainer'}</span>
 </div>
 </div>
 </div>
 </div>

 {/* SIDEBAR CARD 2: SMART AI RECOMMENDATIONS & ACTIONS */}
 <div className="bg-neutral-50/40 border border-neutral-200/60 rounded-3xl p-5 space-y-4">
 <div>
 <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-wide">Smart Recommendations</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Automated AI tasks & optimization cues.</p>
 </div>

 <div className="space-y-3 pt-1">
 {/* Rec 1: Membership renewal */}
 {remainingDaysText.includes('Expired') || parseInt(remainingDaysText) <= 5 ? (
 <div className="p-3 bg-warning-light border border-amber-200 rounded-2xl space-y-2">
 <div className="flex items-start gap-2 text-amber-700">
 <AlertCircle size={14} className="shrink-0 mt-0.5" />
 <span className="text-[10px] font-bold font-sans">Membership expires/expired soon.</span>
 </div>
 <button 
 onClick={() => router.push(`/workspace/memberships/purchase?memberId=${id}`)}
 className="w-full py-1.5 bg-warning-light hover:bg-warning-light text-amber-700 text-[10px] font-extrabold rounded-lg transition text-center"
 >
 Renew Membership Now
 </button>
 </div>
 ) : (
 <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-2xl space-y-1.5">
 <div className="flex items-start gap-2 text-neutral-600">
 <Sparkles size={13} className="shrink-0 text-primary mt-0.5" />
 <span className="text-[10px] font-medium leading-relaxed">Membership status is stable. <b>{remainingDaysText} remaining</b>.</span>
 </div>
 </div>
 )}

 {/* Rec 2: Missed workouts */}
 <div className="p-3 bg-danger-light border border-red-200 rounded-2xl space-y-2">
 <div className="flex items-start gap-2 text-danger">
 <AlertCircle size={14} className="shrink-0 mt-0.5" />
 <span className="text-[10px] font-bold font-sans">Member missed 4 workouts this week.</span>
 </div>
 <button 
 onClick={() => {
 setNoteType('Trainer');
 setNoteContent('Hey! Noticed you missed some sessions this week. Let me know if you need to adjust schedule!');
 setActiveTab('notes');
 }}
 className="w-full py-1.5 bg-danger-light hover:bg-danger-light text-danger text-[10px] font-extrabold rounded-lg transition text-center"
 >
 Log Follow-up Coaching Note
 </button>
 </div>

 {/* Rec 3: Weight loss slow */}
 <div className="p-3 bg-primary-light border border-primary/20 rounded-2xl space-y-2">
 <div className="flex items-start gap-2 text-primary">
 <TrendingDown size={14} className="shrink-0 mt-0.5" />
 <span className="text-[10px] font-bold font-sans">Weight loss progress has slowed down.</span>
 </div>
 <button 
 onClick={() => setActiveTab('workouts')}
 className="w-full py-1.5 bg-primary-light hover:bg-primary-light text-primary text-[10px] font-extrabold rounded-lg transition text-center"
 >
 Review Workout Routine
 </button>
 </div>
 </div>
 </div>

 {/* SIDEBAR CARD 3: TODAY'S ACTIVE WORKOUT SCHEDULE */}
 <div className="bg-neutral-50/40 border border-neutral-200/60 rounded-3xl p-5 space-y-4">
 <div>
 <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Today's Workout Program</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Routines assigned for active sessions.</p>
 </div>

 {workoutsList.length > 0 ? (
 <div className="space-y-3">
 <div className="bg-neutral-50/60 border border-neutral-200 p-3 rounded-2xl">
 <span className="text-[10px] text-neutral-800 font-bold block">{workoutsList[0].name}</span>
 <span className="text-[10px] text-neutral-500 block mt-1">{workoutsList[0].exercises?.length || 0} Exercises • {workoutsList[0].weeks || 'Mon, Wed, Fri'}</span>
 </div>
 <button
 onClick={() => {
 setWorkoutsSubTab('calendar');
 setActiveTab('workouts');
 }}
 className="w-full py-2 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-[10px] font-bold rounded-xl transition text-center cursor-pointer"
 >
 Inspect Exercises Checklist
 </button>
 </div>
 ) : (
 <div className="p-4 text-center bg-neutral-50/40 border border-dashed border-neutral-200 rounded-2xl">
 <span className="text-[10px] text-neutral-500 font-mono block">No program assigned for today.</span>
 </div>
 )}
 </div>

 {/* SIDEBAR CARD 4: FINANCIAL & OUTSTANDING ACTIONS */}
 <div className="bg-neutral-50/40 border border-neutral-200/60 rounded-3xl p-5 space-y-4">
 <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
 <div>
 <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wide font-display">Outstanding Balance</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Billing logs and due invoices.</p>
 </div>
 <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
 outstandingBalance > 0 ? 'bg-danger-light text-danger border border-red-200' : 'bg-success-light text-success border border-green-200'
 }`}>
 ₹{outstandingBalance.toLocaleString()}
 </span>
 </div>

 <div className="space-y-3 text-xs font-mono">
 <div className="flex justify-between"><span className="text-neutral-600 font-sans">Current Membership Plan</span><span className="text-neutral-800 font-semibold font-sans">{currentPlanName}</span></div>
 <div className="flex justify-between"><span className="text-neutral-600 font-sans">Total Lifetime Revenue</span><span className="text-neutral-800 font-semibold">₹{lifetimeRevenue.toLocaleString()}</span></div>
 </div>

 {hasFullAccess && outstandingBalance > 0 && (
 <button 
 onClick={() => { setDrawerAction('record-payment'); setShowDrawer(true); }}
 className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white text-[10px] font-bold rounded-xl transition text-center cursor-pointer flex items-center justify-center gap-1"
 >
 <DollarSign size={12} />
 <span>Record Due Payment</span>
 </button>
 )}
 </div>

 {/* SIDEBAR CARD 5: COORDINATOR STAFF DIRECTORY */}
 <div className="bg-neutral-50/40 border border-neutral-200/60 rounded-3xl p-5 space-y-4">
 <div>
 <h3 className="text-xs font-bold text-neutral-700 uppercase font-mono tracking-wider">Assigned Coordinator Staff</h3>
 <p className="text-[9px] text-neutral-500 mt-0.5">Aligned team personnel.</p>
 </div>

 <div className="space-y-3 pt-1">
 <div className="flex items-center justify-between p-2.5 bg-neutral-50/40 border border-neutral-200 rounded-2xl">
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-bold text-cyan-400 text-[10px]">
 {ai.assignedTrainerName ? ai.assignedTrainerName.split(' ').map((n: string) => n[0]).join('').toUpperCase() : '?'}
 </div>
 <div>
 <span className="text-[9px] text-neutral-500 font-mono block uppercase">Personal Trainer</span>
 <span className="text-neutral-800 font-bold text-[10.5px] mt-0.5 block">{ai.assignedTrainerName || 'Unassigned'}</span>
 </div>
 </div>
 </div>

 <div className="flex items-center justify-between p-2.5 bg-neutral-50/40 border border-neutral-200 rounded-2xl">
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 rounded-full bg-success-light border border-green-200 flex items-center justify-center font-bold text-success text-[10px]">
 {ai.assignedDietitianName ? ai.assignedDietitianName.split(' ').map((n: string) => n[0]).join('').toUpperCase() : '?'}
 </div>
 <div>
 <span className="text-[9px] text-neutral-500 font-mono block uppercase">Dietitian</span>
 <span className="text-neutral-800 font-bold text-[10.5px] mt-0.5 block">{ai.assignedDietitianName || 'Unassigned'}</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* SIDEBAR CARD 6: PINNED STAFF NOTE */}
 <div className="bg-neutral-50/40 border border-neutral-200/60 rounded-3xl p-5 space-y-4">
 <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
 <h3 className="text-xs font-bold text-neutral-700 uppercase font-mono tracking-wider">Pinned Staff Note</h3>
 <Pin size={11} className="text-primary animate-pulse" />
 </div>

 {notes.length > 0 ? (
 <div className="space-y-2">
 <p className="text-xs text-neutral-700 italic leading-relaxed">"{notes[0].content}"</p>
 <div className="flex justify-between text-[9px] text-neutral-500 mt-2">
 <span>Posted by {notes[0].author}</span>
 <span>{notes[0].timestamp}</span>
 </div>
 </div>
 ) : (
 <div className="p-4 text-center bg-neutral-50/40 border border-dashed border-neutral-200 rounded-2xl">
 <span className="text-[10px] text-neutral-500 font-mono block">No pinned notes log found.</span>
 </div>
 )}
 </div>

 </div>

 </div>

 {/* OVERLAY DRAWER: QUICK ACTIONS DRAWER */}
 {showDrawer && drawerAction && (
 <div className="fixed inset-0 bg-background backdrop-blur-sm z-50 flex justify-end">
 <div className="w-full max-w-md bg-white border-l border-neutral-200 p-8 overflow-y-auto space-y-6 h-full flex flex-col justify-between">

 <div className="space-y-6">
 <div className="flex justify-between items-center border-b border-neutral-200 pb-4">
 <div>
 <h3 className="text-base font-bold text-neutral-900 capitalize">
 {drawerAction.replace('-', ' ')}
 </h3>
 <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">{memberId}</span>
 </div>
 <button
 onClick={() => setShowDrawer(false)}
 className="px-2 py-1 bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-neutral-800 text-[10px] font-semibold rounded-lg"
 >
 Close Drawer
 </button>
 </div>

 {/* ACTION: EDIT PROFILE */}
 {drawerAction === 'edit-member' && (
 <form onSubmit={async (e) => {
 e.preventDefault();
 try {
 setSaving(true);
 await membersApi.update(id, {
 firstName: member.firstName,
 lastName: member.lastName,
 phoneNumber: member.phoneNumber,
 });
 showToast('Member profile saved successfully');
 setShowDrawer(false);
 loadData();
 } catch (_) {
 showToast('Failed to save profile changes', 'error');
 } finally {
 setSaving(false);
 }
 }} className="space-y-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">First Name</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={member.firstName}
 onChange={e => setMember({ ...member, firstName: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Last Name</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={member.lastName}
 onChange={e => setMember({ ...member, lastName: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Phone Number</label>
 <input
 type="tel"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={member.phoneNumber}
 onChange={e => setMember({ ...member, phoneNumber: e.target.value })}
 />
 </div>
 <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition mt-4">
 {saving ? 'Saving...' : 'Save Profile Details'}
 </button>
 </form>
 )}

 {/* ACTION: CREATE MEMBERSHIP */}
 {drawerAction === 'create-membership' && (
 <form onSubmit={handleDrawerSubmit} className="space-y-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Membership Plan</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={newMembership.planName}
 onChange={e => {
 const selectedPlan = orgPlans.find(p => p.name === e.target.value);
 setNewMembership({
 planName: e.target.value,
 amount: selectedPlan ? String(selectedPlan.basePrice) : '0',
 durationMonths: selectedPlan ? String(selectedPlan.durationValue) : '1'
 });
 }}
 >
 <option value="">Select Plan</option>
 {orgPlans.map(p => (
 <option key={p.id} value={p.name}>
 {p.name} (₹{p.basePrice} / {p.durationValue} {p.durationType})
 </option>
 ))}
 </select>
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Billing Amount ($)</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={newMembership.amount}
 onChange={e => setNewMembership({ ...newMembership, amount: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Agreement Period (Months)</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={newMembership.durationMonths}
 onChange={e => setNewMembership({ ...newMembership, durationMonths: e.target.value })}
 />
 </div>
 <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition mt-4">
 {saving ? 'Creating...' : 'Issue Membership Agreement'}
 </button>
 </form>
 )}

 {/* ACTION: RECORD PAYMENT */}
 {drawerAction === 'record-payment' && (
 <form onSubmit={handleDrawerSubmit} className="space-y-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Target Invoice Number</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={newPayment.invoiceNumber}
 onChange={e => setNewPayment({ ...newPayment, invoiceNumber: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Payment Amount ($)</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={newPayment.amount}
 onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Payment Method</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={newPayment.method}
 onChange={e => setNewPayment({ ...newPayment, method: e.target.value })}
 >
 <option value="Credit Card">Credit Card</option>
 <option value="Cash">Cash Ledger</option>
 <option value="Bank Transfer">Bank Transfer</option>
 </select>
 </div>
 <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition mt-4">
 {saving ? 'Recording...' : 'Post Payment Ledger'}
 </button>
 </form>
 )}

 {/* ACTION: ASSIGN WORKOUT */}
 {drawerAction === 'assign-workout' && (
 <form onSubmit={handleDrawerSubmit} className="space-y-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Workout Routine Name</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={newWorkout.programName}
 onChange={e => setNewWorkout({ ...newWorkout, programName: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Training Instructions</label>
 <textarea
 rows={4}
 className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-xs text-neutral-900 focus:outline-none"
 value={newWorkout.notes}
 onChange={e => setNewWorkout({ ...newWorkout, notes: e.target.value })}
 />
 </div>
 <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition mt-4">
 {saving ? 'Assigning...' : 'Assign Fitness Routine'}
 </button>
 </form>
 )}

 {/* ACTION: ASSIGN DIET */}
 {drawerAction === 'assign-diet' && (
 <form onSubmit={handleDrawerSubmit} className="space-y-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Diet Regimen Title</label>
 <input
 type="text"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={newDiet.planName}
 onChange={e => setNewDiet({ ...newDiet, planName: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Target Daily Intake (kcal)</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={newDiet.dailyCalories}
 onChange={e => setNewDiet({ ...newDiet, dailyCalories: e.target.value })}
 />
 </div>
 <div className="grid grid-cols-3 gap-2">
 <div className="space-y-1">
 <label className="text-[9px] text-neutral-500 font-mono uppercase block">Protein (g)</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-2 py-2 text-xs text-neutral-900 text-center font-mono"
 value={newDiet.proteinGrams}
 onChange={e => setNewDiet({ ...newDiet, proteinGrams: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[9px] text-neutral-500 font-mono uppercase block">Carbs (g)</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-2 py-2 text-xs text-neutral-900 text-center font-mono"
 value={newDiet.carbGrams}
 onChange={e => setNewDiet({ ...newDiet, carbGrams: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[9px] text-neutral-500 font-mono uppercase block">Fats (g)</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-2 py-2 text-xs text-neutral-900 text-center font-mono"
 value={newDiet.fatGrams}
 onChange={e => setNewDiet({ ...newDiet, fatGrams: e.target.value })}
 />
 </div>
 </div>
 <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition mt-4">
 {saving ? 'Assigning...' : 'Assign Dietary Plan'}
 </button>
 </form>
 )}

 {/* ACTION: RECORD MEASUREMENT */}
 {drawerAction === 'record-measurement' && (
 <form onSubmit={handleCreateMeasurement} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Height (cm)</label>
 <input
 type="number"
 step="0.1"
 required
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={newMeasurement.height}
 onChange={e => setNewMeasurement({ ...newMeasurement, height: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Weight (kg)</label>
 <input
 type="number"
 step="0.1"
 required
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={newMeasurement.weight}
 onChange={e => setNewMeasurement({ ...newMeasurement, weight: e.target.value })}
 />
 </div>
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Body Fat Percentage (%)</label>
 <input
 type="number"
 step="0.1"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
 value={newMeasurement.bodyFatPercentage}
 onChange={e => setNewMeasurement({ ...newMeasurement, bodyFatPercentage: e.target.value })}
 />
 </div>
 <div className="grid grid-cols-2 gap-4 border-t border-neutral-200 pt-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase">Waist Circumference (cm)</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs text-neutral-900 font-mono"
 value={newMeasurement.waist}
 onChange={e => setNewMeasurement({ ...newMeasurement, waist: e.target.value })}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-500 font-mono uppercase">Chest Circumference (cm)</label>
 <input
 type="number"
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 text-xs text-neutral-900 font-mono"
 value={newMeasurement.chest}
 onChange={e => setNewMeasurement({ ...newMeasurement, chest: e.target.value })}
 />
 </div>
 </div>
 <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition mt-4">
 {saving ? 'Recording...' : 'Record Biometric Statistics'}
 </button>
 </form>
 )}

 {/* ACTION: UPLOAD DOCUMENT */}
 {drawerAction === 'upload-document' && (
 <form onSubmit={handleDrawerSubmit} className="space-y-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-600 font-mono uppercase font-semibold">Document Type</label>
 <select
 className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-900 focus:outline-none"
 value={newDocument.documentType}
 onChange={e => setNewDocument({ ...newDocument, documentType: e.target.value })}
 >
 <option value="ID Proof">Government ID Proof</option>
 <option value="Medical Certificate">Medical clearance note</option>
 <option value="Consent Waiver">Consent Agreement waiver</option>
 </select>
 </div>

 {/* Hidden file input */}
 <input
 type="file"
 ref={fileInputRef}
 className="hidden"
 onChange={e => {
 if (e.target.files && e.target.files.length > 0) {
 setSelectedFile(e.target.files[0]);
 }
 }}
 accept=".pdf,.jpg,.jpeg,.png"
 />

 <div
 onClick={() => fileInputRef.current?.click()}
 className="border-2 border-dashed border-neutral-200 hover:border-red-200 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center"
 >
 <Upload className="text-neutral-500 mb-2" size={24} />
 {selectedFile ? (
 <div>
 <span className="text-xs font-bold text-success block truncate max-w-[280px]">
 {selectedFile.name}
 </span>
 <span className="text-[9px] text-neutral-500 mt-1 block">
 {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
 </span>
 </div>
 ) : (
 <div>
 <span className="text-xs font-bold text-neutral-700 block">Click to select file to upload</span>
 <span className="text-[9px] text-neutral-500 mt-1 block">Maximum size: 8MB (PDF, JPG, PNG)</span>
 </div>
 )}
 </div>

 <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary text-neutral-900 text-xs font-semibold rounded-xl transition mt-4">
 {saving ? 'Uploading...' : 'Upload Document'}
 </button>
 </form>
 )}

 </div>

 <button
 onClick={() => setShowDrawer(false)}
 className="w-full py-2.5 bg-neutral-50 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 hover:text-neutral-800 text-xs font-semibold rounded-xl transition"
 >
 Cancel
 </button>

 </div>
 </div>
 )}

 {/* FREEZE MEMBERSHIP DRAWER */}
 {showFreezeDrawer && (
 <div className="fixed inset-0 z-50 flex">
  <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowFreezeDrawer(false)} />
  <div className="relative ml-auto w-full max-w-md h-full bg-white shadow-2xl flex flex-col overflow-y-auto">
  <div className="px-6 py-5 border-b border-neutral-200/80 flex items-center justify-between shrink-0">
   <div>
   <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
    <Pause className="w-4 h-4 text-sky-500" />
    Request Membership Freeze
   </h2>
   <p className="text-[10px] text-neutral-500 font-mono mt-0.5">Submit a hold request for review by management</p>
   </div>
   <button onClick={() => setShowFreezeDrawer(false)} className="text-neutral-400 hover:text-neutral-600 transition">
   <X size={18} />
   </button>
  </div>

  <form onSubmit={handleFreezeSubmit} className="flex-1 flex flex-col gap-5 px-6 py-5">
   {memberships.length > 1 && (
   <div>
    <label className="text-[10px] text-neutral-500 font-mono uppercase block mb-1.5">Subscription</label>
    <select
    value={freezeSubId}
    onChange={e => setFreezeSubId(e.target.value)}
    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-none focus:border-primary"
    required
    >
    <option value="">Select subscription...</option>
    {memberships.filter((m: any) => m.status.toLowerCase() === 'active').map((m: any) => (
     <option key={m.id} value={m.id}>{m.plan} (ends {m.end})</option>
    ))}
    </select>
   </div>
   )}

   <div className="grid grid-cols-2 gap-3">
   <div>
    <label className="text-[10px] text-neutral-500 font-mono uppercase block mb-1.5">Freeze Start Date</label>
    <input
    type="date"
    value={freezeStartDate}
    onChange={e => setFreezeStartDate(e.target.value)}
    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-none focus:border-primary"
    required
    />
   </div>
   <div>
    <label className="text-[10px] text-neutral-500 font-mono uppercase block mb-1.5">Freeze End Date</label>
    <input
    type="date"
    value={freezeEndDate}
    min={freezeStartDate}
    onChange={e => setFreezeEndDate(e.target.value)}
    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-none focus:border-primary"
    required
    />
   </div>
   </div>

   {freezeStartDate && freezeEndDate && (
   <div className="bg-sky-50 border border-sky-100 rounded-xl px-4 py-3 text-xs text-sky-700">
    <span className="font-mono font-bold block">Hold Duration Preview</span>
    <span className="text-sky-600 font-mono text-[11px] block mt-1">
    {Math.max(1, Math.ceil((new Date(freezeEndDate).getTime() - new Date(freezeStartDate).getTime()) / (1000 * 3600 * 24)))} days · membership end date will be extended accordingly
    </span>
   </div>
   )}

   <div>
   <label className="text-[10px] text-neutral-500 font-mono uppercase block mb-1.5">Reason Category</label>
   <select
    value={freezeReasonCat}
    onChange={e => setFreezeReasonCat(e.target.value)}
    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-none focus:border-primary"
   >
    <option value="Medical">Medical</option>
    <option value="Travel">Travel</option>
    <option value="Personal">Personal</option>
    <option value="Financial">Financial</option>
    <option value="Other">Other</option>
   </select>
   </div>

   <div>
   <label className="text-[10px] text-neutral-500 font-mono uppercase block mb-1.5">Notes (optional)</label>
   <textarea
    value={freezeNotesText}
    onChange={e => setFreezeNotesText(e.target.value)}
    rows={3}
    placeholder="Any additional context for the review team..."
    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-800 focus:outline-none focus:border-primary resize-none"
   />
   </div>

   <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-[10px] text-amber-700 font-mono">
   This request goes to Pending Approval. Management will approve or reject before the hold activates.
   </div>

   <div className="flex gap-3 mt-auto">
   <button
    type="button"
    onClick={() => setShowFreezeDrawer(false)}
    className="flex-1 py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-600 text-xs font-semibold rounded-xl transition"
   >
    Cancel
   </button>
   <button
    type="submit"
    disabled={freezeSubmitting || !freezeSubId}
    className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
   >
    {freezeSubmitting ? 'Submitting...' : 'Submit Freeze Request'}
   </button>
   </div>
  </form>
  </div>
 </div>
 )}

 </div>
 );
}
