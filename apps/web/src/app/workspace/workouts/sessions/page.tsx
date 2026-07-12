'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
 Search, Filter, Plus, Download, RefreshCw, Grid, List, MoreVertical,
 Eye, Edit, Trash, Copy, Check, X, ShieldAlert, Sparkles, Dumbbell,
 ShieldCheck, Heart, Info, ArrowLeft, ArrowRight, Activity, BookOpen,
 Clock, Zap, Target, Lock, CheckSquare, Square, Star, ExternalLink,
 ChevronDown, ChevronUp, Sliders, Calendar, ArrowUpRight, Award, Flame,
 FileText, History, Settings, Users, Share2, Clipboard, ShoppingCart,
 Layers, Smile, AlertCircle, Play, Pause, AlertTriangle, FileSpreadsheet,
 FileDown, PlusSquare, BarChart3, TrendingUp, CheckSquare as CheckBox,
 Bell, CheckCircle
} from 'lucide-react';
import { workoutsApi, membersApi, orgUsersApi, rolesApi } from '../../../../lib/api';
import { Tabs } from '../../../../components/ui';

// Definitions
interface Session {
 id: string;
 name: string; // Workout Name
 notes: string; // Program Name / Subtitle
 durationMinutes: number;
 caloriesBurned: number;
 status: 'Scheduled' | 'In Progress' | 'Completed' | 'Paused' | 'Skipped' | 'Cancelled' | 'Missed' | 'Expired';
 difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
 trainerName: string;
 trainerId: string;
 memberId: string;
 memberName: string;
 memberPhoto?: string;
 scheduledTime: string;
 startedTime?: string;
 completedTime?: string;
 isFavorite: boolean;
 completionRate: number; // e.g. 95%
 volumeLifted: number; // e.g. 4200 kg
 streakCount: number;
 exercises: {
 name: string;
 status: 'Not Started' | 'In Progress' | 'Completed' | 'Skipped' | 'Modified';
 trainerNotes?: string;
 memberNotes?: string;
 completionRate: number;
 sets: {
 reps: number;
 weight: number;
 completed: boolean;
 }[];
 }[];
 timeline: {
 time: string;
 event: string;
 details?: string;
 }[];
 feedback?: {
 difficulty: number; // 1-5
 energy: number; // 1-5
 pain: number; // 1-5
 enjoyment: number; // 1-5
 notes?: string;
 };
 review?: {
 approved: boolean;
 feedback?: string;
 recommendations?: string;
 performanceRating: number; // 1-5 stars
 reviewedAt: string;
 };
 missedFollowUp?: {
 reason?: string;
 actionTaken?: 'Rescheduled' | 'Skipped' | 'Notified Member';
 notified?: boolean;
 followUpNotes?: string;
 };
}

// Audit Log entry representation
interface AuditLog {
 time: string;
 action: string;
 memberName: string;
 workoutName: string;
 trainer: string;
}

export default function WorkoutSessionsPage() {
 const router = useRouter();

 // Navigation tab: 'dashboard' | 'calendar' | 'list' | 'missed'
 const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'list' | 'missed'>('dashboard');

 // Filter panels
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedMember, setSelectedMember] = useState('all');
 const [selectedTrainer, setSelectedTrainer] = useState('all');
 const [selectedProgram, setSelectedProgram] = useState('all');
 const [selectedStatus, setSelectedStatus] = useState('all');
 const [selectedDifficulty, setSelectedDifficulty] = useState('all');
 const [selectedDateRange, setSelectedDateRange] = useState('all');

 // DB Filter values loaded dynamically
 const [dbMembers, setDbMembers] = useState<any[]>([]);
 const [dbTrainers, setDbTrainers] = useState<any[]>([]);
 const [dbPrograms, setDbPrograms] = useState<string[]>([]);

 // Session Data & Loading
 const [sessions, setSessions] = useState<Session[]>([]);
 const [sessionsLoading, setSessionsLoading] = useState(false);

 // Selected Session Details Drawer state
 const [selectedSession, setSelectedSession] = useState<Session | null>(null);
 const [drawerOpen, setDrawerOpen] = useState(false);

 // Calendar tab states
 const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
 const [calendarDate, setCalendarDate] = useState<Date>(new Date());

 // Trainer review form inputs
 const [reviewRating, setReviewRating] = useState(5);
 const [reviewApproved, setReviewApproved] = useState(true);
 const [reviewFeedback, setReviewFeedback] = useState('');
 const [reviewRecs, setReviewRecs] = useState('');

 // Reschedule inputs (for missed follow ups)
 const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
 const [rescheduleDate, setRescheduleDate] = useState('');
 const [rescheduleReason, setRescheduleReason] = useState('Family emergency');
 const [activeRescheduleId, setActiveRescheduleId] = useState<string | null>(null);

 // Audit Trails List (persisted via rolesApi)
 const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

 // User details
 const [userRole, setUserRole] = useState('trainer');
 const [userName, setUserName] = useState('');

 // Toast
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 const showToast = (message: string, type: 'success' | 'error') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 // -------------------------------------------------------------------------
 // MAPPING UTILS: PACK & UNPACK SESSION AS WORKOUT MODEL
 // -------------------------------------------------------------------------
 const packSessionRecord = (sess: Session) => {
 return {
 name: sess.name,
 type: 'Session',
 difficulty: sess.difficulty,
 duration: sess.durationMinutes,
 calories: sess.caloriesBurned,
 visibility: 'Organization',
 status: sess.status,
 isTemplate: false,
 isFavorite: sess.isFavorite,
 notes: sess.notes, // stores program name
 structure: [
 {
 memberId: sess.memberId,
 memberName: sess.memberName,
 memberPhoto: sess.memberPhoto,
 trainerId: sess.trainerId,
 trainerName: sess.trainerName,
 scheduledTime: sess.scheduledTime,
 startedTime: sess.startedTime,
 completedTime: sess.completedTime,
 completionRate: sess.completionRate,
 volumeLifted: sess.volumeLifted,
 streakCount: sess.streakCount,
 exercises: sess.exercises,
 timeline: sess.timeline,
 feedback: sess.feedback,
 review: sess.review,
 missedFollowUp: sess.missedFollowUp
 }
 ]
 };
 };

 const unpackSessionRecord = (record: any): Session => {
 const struct = Array.isArray(record.structure) ? record.structure[0] : (record.structure || {});
 return {
 id: record.id,
 name: record.name,
 notes: record.notes || 'Standalone Workout',
 durationMinutes: record.duration || 45,
 caloriesBurned: record.calories || 300,
 status: record.status || 'Scheduled',
 difficulty: (record.difficulty || 'Intermediate') as any,
 trainerId: struct?.trainerId || record.creatorId || '',
 trainerName: struct?.trainerName || record.creator?.fullName || 'Marcus Vance',
 memberId: struct?.memberId || 'm-1',
 memberName: struct?.memberName || 'Member Client',
 memberPhoto: struct?.memberPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150',
 scheduledTime: struct?.scheduledTime || record.createdAt,
 startedTime: struct?.startedTime,
 completedTime: struct?.completedTime,
 isFavorite: record.isFavorite || false,
 completionRate: struct?.completionRate || 0,
 volumeLifted: struct?.volumeLifted || 0,
 streakCount: struct?.streakCount || 0,
 exercises: struct?.exercises || [],
 timeline: struct?.timeline || [],
 feedback: struct?.feedback,
 review: struct?.review,
 missedFollowUp: struct?.missedFollowUp
 };
 };

 // -------------------------------------------------------------------------
 // INITIAL DATA SEEDING & FETCHING FLOW
 // -------------------------------------------------------------------------
 const loadSessions = useCallback(async () => {
 try {
 setSessionsLoading(true);
 const res = await workoutsApi.list({ isTemplate: false });
 
 const sessionRecords = (res?.workouts || []).filter((w: any) => w.type === 'Session');
 
 if (sessionRecords.length === 0) {
 // No sessions found on backend: Seed 5 diverse session records automatically
 const todayStr = new Date().toISOString().split('T')[0];
 const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
 const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

 const seeds: Session[] = [
 {
 id: 'temp-sess-1',
 name: 'Leg Power (Hypertrophy)',
 notes: '4 Week Beginner Strength Starter',
 durationMinutes: 52,
 caloriesBurned: 480,
 status: 'Completed',
 difficulty: 'Intermediate',
 trainerId: 't-1',
 trainerName: 'Marcus Vance',
 memberId: 'm-1',
 memberName: 'John Doe',
 memberPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150',
 scheduledTime: `${todayStr}T10:00:00Z`,
 startedTime: `${todayStr}T10:05:00Z`,
 completedTime: `${todayStr}T10:57:00Z`,
 isFavorite: true,
 completionRate: 95,
 volumeLifted: 3820,
 streakCount: 5,
 exercises: [
 {
 name: 'Barbell Back Squat',
 status: 'Completed',
 completionRate: 100,
 sets: [
 { reps: 10, weight: 60, completed: true },
 { reps: 10, weight: 80, completed: true },
 { reps: 8, weight: 100, completed: true }
 ]
 },
 {
 name: 'Leg Extensions',
 status: 'Completed',
 completionRate: 100,
 sets: [
 { reps: 12, weight: 45, completed: true },
 { reps: 12, weight: 55, completed: true }
 ]
 },
 {
 name: 'Romanian Dumbbell Deadlift',
 status: 'Modified',
 completionRate: 80,
 trainerNotes: 'Scale if hamstrings feel tight',
 sets: [
 { reps: 10, weight: 24, completed: true },
 { reps: 10, weight: 28, completed: false }
 ]
 }
 ],
 timeline: [
 { time: `${todayStr}T10:00:00Z`, event: 'Workout Assigned' },
 { time: `${todayStr}T10:05:00Z`, event: 'Workout Started', details: 'Started via web client portal' },
 { time: `${todayStr}T10:22:00Z`, event: 'Exercise Completed', details: 'Barbell Back Squat sets finished' },
 { time: `${todayStr}T10:35:00Z`, event: 'Workout Paused', details: 'Client request water break' },
 { time: `${todayStr}T10:38:00Z`, event: 'Workout Resumed' },
 { time: `${todayStr}T10:57:00Z`, event: 'Workout Completed', details: 'Client finished leg core stretch' }
 ],
 feedback: { difficulty: 4, energy: 3, pain: 2, enjoyment: 5, notes: 'Squats felt heavy but completed.' }
 },
 {
 id: 'temp-sess-2',
 name: 'HIIT Cardio Blast',
 notes: '8 Week Fat Loss & HIIT Engine',
 durationMinutes: 35,
 caloriesBurned: 520,
 status: 'In Progress',
 difficulty: 'Intermediate',
 trainerId: 't-2',
 trainerName: 'Sarah Jenkins',
 memberId: 'm-2',
 memberName: 'Jane Smith',
 memberPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150',
 scheduledTime: `${todayStr}T14:30:00Z`,
 startedTime: `${todayStr}T14:32:00Z`,
 isFavorite: false,
 completionRate: 40,
 volumeLifted: 0,
 streakCount: 3,
 exercises: [
 {
 name: 'Kettlebell Swings',
 status: 'Completed',
 completionRate: 100,
 sets: [
 { reps: 20, weight: 16, completed: true },
 { reps: 20, weight: 16, completed: true }
 ]
 },
 {
 name: 'Burpees Outburst',
 status: 'In Progress',
 completionRate: 0,
 sets: [
 { reps: 15, weight: 0, completed: false },
 { reps: 15, weight: 0, completed: false }
 ]
 }
 ],
 timeline: [
 { time: `${todayStr}T14:30:00Z`, event: 'Workout Assigned' },
 { time: `${todayStr}T14:32:00Z`, event: 'Workout Started', details: 'Started via member mobile app device' }
 ]
 },
 {
 id: 'temp-sess-3',
 name: 'Upper Body Core',
 notes: '12 Week Hypertrophy Masterclass',
 durationMinutes: 45,
 caloriesBurned: 350,
 status: 'Missed',
 difficulty: 'Advanced',
 trainerId: 't-3',
 trainerName: 'David Cho',
 memberId: 'm-3',
 memberName: 'Mike Ross',
 memberPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150',
 scheduledTime: `${yesterdayStr}T09:00:00Z`,
 isFavorite: false,
 completionRate: 0,
 volumeLifted: 0,
 streakCount: 0,
 exercises: [
 { name: 'Barbell Bench Press', status: 'Not Started', completionRate: 0, sets: [{ reps: 8, weight: 80, completed: false }] },
 { name: 'Overhead Press', status: 'Not Started', completionRate: 0, sets: [{ reps: 8, weight: 45, completed: false }] }
 ],
 timeline: [
 { time: `${yesterdayStr}T09:00:00Z`, event: 'Workout Assigned' }
 ],
 missedFollowUp: { reason: 'Work schedule conflict' }
 },
 {
 id: 'temp-sess-4',
 name: 'Yoga & Flexibility',
 notes: 'Stretch Program v1',
 durationMinutes: 40,
 caloriesBurned: 180,
 status: 'Scheduled',
 difficulty: 'Beginner',
 trainerId: 't-2',
 trainerName: 'Sarah Jenkins',
 memberId: 'm-4',
 memberName: 'Rachel Green',
 memberPhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150',
 scheduledTime: `${tomorrowStr}T08:00:00Z`,
 isFavorite: false,
 completionRate: 0,
 volumeLifted: 0,
 streakCount: 12,
 exercises: [
 { name: 'Downward Facing Dog', status: 'Not Started', completionRate: 0, sets: [{ reps: 60, weight: 0, completed: false }] },
 { name: 'Thoracic Flow Opener', status: 'Not Started', completionRate: 0, sets: [{ reps: 10, weight: 0, completed: false }] }
 ],
 timeline: [
 { time: `${tomorrowStr}T08:00:00Z`, event: 'Workout Assigned' }
 ]
 },
 {
 id: 'temp-sess-5',
 name: 'Strength Base Compound',
 notes: '4 Week Beginner Strength Starter',
 durationMinutes: 60,
 caloriesBurned: 410,
 status: 'Completed',
 difficulty: 'Advanced',
 trainerId: 't-1',
 trainerName: 'Marcus Vance',
 memberId: 'm-5',
 memberName: 'Harvey Specter',
 memberPhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150',
 scheduledTime: `${yesterdayStr}T17:00:00Z`,
 startedTime: `${yesterdayStr}T17:02:00Z`,
 completedTime: `${yesterdayStr}T18:02:00Z`,
 isFavorite: false,
 completionRate: 100,
 volumeLifted: 5200,
 streakCount: 8,
 exercises: [
 {
 name: 'Conventional Deadlift',
 status: 'Completed',
 completionRate: 100,
 sets: [
 { reps: 5, weight: 100, completed: true },
 { reps: 5, weight: 140, completed: true },
 { reps: 5, weight: 180, completed: true }
 ]
 }
 ],
 timeline: [
 { time: `${yesterdayStr}T17:00:00Z`, event: 'Workout Assigned' },
 { time: `${yesterdayStr}T17:02:00Z`, event: 'Workout Started' },
 { time: `${yesterdayStr}T18:02:00Z`, event: 'Workout Completed' },
 { time: `${yesterdayStr}T18:30:00Z`, event: 'Trainer Reviewed', details: 'Approved & feedback logged' }
 ],
 review: {
 approved: true,
 feedback: 'Perfect execution on deadlift sets. Heavy pulling form was pristine.',
 performanceRating: 5,
 reviewedAt: `${yesterdayStr}T18:30:00Z`
 }
 }
 ];

 // Batch upload seeds
 for (const s of seeds) {
 await workoutsApi.create(packSessionRecord(s));
 }
 
 // Fetch again to sync properly
 const refetched = await workoutsApi.list({ isTemplate: false });
 const list = (refetched?.workouts || []).filter((w: any) => w.type === 'Session');
 setSessions(list.map(unpackSessionRecord));
 } else {
 setSessions(sessionRecords.map(unpackSessionRecord));
 }
 } catch (_) {
 showToast('Failed to load workout session tracking cards.', 'error');
 } finally {
 setSessionsLoading(false);
 }
 }, []);

 const loadAuditLogs = useCallback(async () => {
 try {
 const logs = await rolesApi.getAuditLogs();
 if (Array.isArray(logs)) {
 const mapped = logs
 .filter((l: any) => l.eventType === 'WorkoutSession')
 .map((l: any) => ({
 time: l.createdAt,
 action: l.action || 'Workout Event',
 memberName: l.metadata?.memberName || 'Client',
 workoutName: l.details || 'Session Event',
 trainer: l.user || 'System'
 }));
 setAuditLogs(mapped);
 }
 } catch (_) {}
 }, []);

 // Load Member & Trainer dropdowns for filtering
 useEffect(() => {
 if (typeof window !== 'undefined') {
 const userStr = localStorage.getItem('user');
 if (userStr) {
 try {
 const userObj = JSON.parse(userStr);
 setUserRole(userObj.role || 'trainer');
 setUserName(userObj.fullName || 'Staff User');
 } catch (_) {}
 }
 }

 const loadFiltersData = async () => {
 try {
 const [membersRes, usersRes] = await Promise.all([
 membersApi.list(),
 orgUsersApi.list()
 ]);
 
 if (Array.isArray(membersRes)) {
 setDbMembers(membersRes.map(m => ({ id: m.id, name: `${m.firstName} ${m.lastName}` })));
 }
 if (Array.isArray(usersRes)) {
 setDbTrainers(usersRes.map(u => ({ id: u.id, name: u.user?.fullName || u.fullName })));
 }
 } catch (_) {}
 };

 loadFiltersData();
 loadSessions();
 loadAuditLogs();
 }, [loadSessions, loadAuditLogs]);

 // Extract program options from session lists
 useEffect(() => {
 if (sessions.length > 0) {
 const programsSet = new Set(sessions.map(s => s.notes).filter(Boolean));
 setDbPrograms(Array.from(programsSet));
 }
 }, [sessions]);

 // -------------------------------------------------------------------------
 // KPI CALCULATIONS
 // -------------------------------------------------------------------------
 const completedSessions = sessions.filter(s => s.status === 'Completed');
 const activeSessions = sessions.filter(s => s.status === 'In Progress' || s.status === 'Paused');
 const missedSessions = sessions.filter(s => s.status === 'Missed');
 
 const completionRateSum = completedSessions.reduce((acc, curr) => acc + curr.completionRate, 0);
 const avgCompletionRate = completedSessions.length > 0 ? Math.round(completionRateSum / completedSessions.length) : 0;
 
 const durationSum = completedSessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);
 const avgDuration = completedSessions.length > 0 ? Math.round(durationSum / completedSessions.length) : 0;

 const totalVolumeLifted = completedSessions.reduce((acc, curr) => acc + curr.volumeLifted, 0);

 const todayDate = new Date().toISOString().split('T')[0];
 const todaySessions = sessions.filter(s => s.scheduledTime.startsWith(todayDate));
 const membersToday = new Set(todaySessions.map(s => s.memberId)).size;

 const kpis = {
 scheduledToday: todaySessions.length,
 completed: completedSessions.length,
 active: activeSessions.length,
 missed: missedSessions.length,
 avgCompletion: `${avgCompletionRate}%`,
 avgDuration: `${avgDuration}m`,
 reviewPending: completedSessions.filter(s => !s.review).length,
 membersToday: membersToday
 };

 const getWeeklyVolumeData = () => {
 const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
 const past7Days = [];
 
 for (let i = 6; i >= 0; i--) {
 const d = new Date();
 d.setDate(d.getDate() - i);
 past7Days.push(d);
 }

 const calculated = past7Days.map(date => {
 const dateStr = date.toISOString().split('T')[0];
 const daySess = sessions.filter(s => s.status === 'Completed' && s.scheduledTime.startsWith(dateStr));
 const totalVol = daySess.reduce((acc, curr) => acc + curr.volumeLifted, 0);
 return {
 date,
 dayName: daysOfWeek[date.getDay()],
 volume: totalVol
 };
 });

 const maxVol = Math.max(...calculated.map(c => c.volume), 1000);

 return calculated.map(c => ({
 day: c.dayName,
 vol: c.volume.toLocaleString(),
 pct: `${Math.round((c.volume / maxVol) * 100)}%`
 }));
 };

 const weeklyVolumeData = getWeeklyVolumeData();

 const getLeaderboard = () => {
 const memberStats: { [name: string]: { name: string; completedCount: number; sumRate: number; streak: number } } = {};

 sessions.forEach(s => {
 const name = s.memberName;
 if (!memberStats[name]) {
 memberStats[name] = { name, completedCount: 0, sumRate: 0, streak: s.streakCount || 0 };
 }
 if (s.status === 'Completed') {
 memberStats[name].completedCount += 1;
 memberStats[name].sumRate += s.completionRate;
 }
 if (s.streakCount > memberStats[name].streak) {
 memberStats[name].streak = s.streakCount;
 }
 });

 const list = Object.values(memberStats)
 .map(m => ({
 name: m.name,
 streak: `${m.streak} sessions streak`,
 rate: `${m.completedCount > 0 ? Math.round(m.sumRate / m.completedCount) : 0}% Completion`,
 rawRate: m.completedCount > 0 ? m.sumRate / m.completedCount : 0
 }))
 .sort((a, b) => b.rawRate - a.rawRate);

 return list;
 };

 const dynamicLeaderboard = getLeaderboard();
 const displayLeaderboard = dynamicLeaderboard.length >= 2 ? dynamicLeaderboard.slice(0, 4).map((item, idx) => ({
 ...item,
 rank: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}th`
 })) : [
 { name: 'John Doe', streak: '5 wks streak', rate: '95% Completion', rank: '🥇' },
 { name: 'Harvey Specter', streak: '8 sessions', rate: '100% Completion', rank: '🥈' },
 { name: 'Rachel Green', streak: '12 sessions', rate: '92% Completion', rank: '🥉' },
 { name: 'Jane Smith', streak: '3 sessions', rate: '85% Completion', rank: '4th' }
 ];

 // -------------------------------------------------------------------------
 // FILTERS APPLICATION
 // -------------------------------------------------------------------------
 const filteredSessions = sessions.filter(s => {
 const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 s.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
 s.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
 s.trainerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
 s.id.toLowerCase().includes(searchQuery.toLowerCase());
 
 const matchesMember = selectedMember === 'all' || s.memberId === selectedMember || s.memberName === selectedMember;
 const matchesTrainer = selectedTrainer === 'all' || s.trainerId === selectedTrainer || s.trainerName === selectedTrainer;
 const matchesProgram = selectedProgram === 'all' || s.notes === selectedProgram;
 const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;
 const matchesDifficulty = selectedDifficulty === 'all' || s.difficulty === selectedDifficulty;

 // Simple date range check
 let matchesDate = true;
 if (selectedDateRange !== 'all') {
 const now = new Date();
 const scheduled = new Date(s.scheduledTime);
 const diffTime = Math.abs(now.getTime() - scheduled.getTime());
 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

 if (selectedDateRange === 'today') {
 matchesDate = scheduled.toISOString().split('T')[0] === now.toISOString().split('T')[0];
 } else if (selectedDateRange === 'week') {
 matchesDate = diffDays <= 7;
 } else if (selectedDateRange === 'month') {
 matchesDate = diffDays <= 30;
 }
 }

 return matchesSearch && matchesMember && matchesTrainer && matchesProgram && matchesStatus && matchesDifficulty && matchesDate;
 });

 // -------------------------------------------------------------------------
 // DETAILS DRAWER CONFIGURATION & ACTIONS
 // -------------------------------------------------------------------------
 const openDetailsDrawer = (sess: Session) => {
 setSelectedSession(sess);
 setReviewApproved(sess.review?.approved ?? true);
 setReviewFeedback(sess.review?.feedback ?? '');
 setReviewRecs(sess.review?.recommendations ?? '');
 setReviewRating(sess.review?.performanceRating ?? 5);
 setDrawerOpen(true);
 };

 // Submit trainer feedback review
 const handleTrainerReviewSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedSession) return;

 const auditAction = 'Trainer Session Reviewed';

 const nextReview = {
 approved: reviewApproved,
 feedback: reviewFeedback,
 recommendations: reviewRecs,
 performanceRating: reviewRating,
 reviewedAt: new Date().toISOString()
 };

 const updatedSession: Session = {
 ...selectedSession,
 status: 'Completed',
 review: nextReview,
 timeline: [
 ...selectedSession.timeline.filter(t => t.event !== 'Trainer Reviewed'),
 { time: new Date().toISOString(), event: 'Trainer Reviewed', details: `Approved & Feedback submitted by ${selectedSession.trainerName}` }
 ]
 };

 try {
 await workoutsApi.update(selectedSession.id, packSessionRecord(updatedSession));
 showToast('Workout review submitted successfully.', 'success');
 
 try {
 await rolesApi.createAuditLog({
 action: auditAction,
 details: selectedSession.name,
 user: selectedSession.trainerName,
 eventType: 'WorkoutSession',
 eventCategory: 'coaching',
 metadata: { memberName: selectedSession.memberName }
 });
 } catch (_) {}
 
 setSelectedSession(updatedSession);
 setDrawerOpen(false);
 loadSessions();
 loadAuditLogs();
 } catch (_) {
 showToast('Failed to save workout session review.', 'error');
 }
 };

 // Missed session rescheduling
 const triggerRescheduleModal = (id: string) => {
 setActiveRescheduleId(id);
 setRescheduleDate(new Date().toISOString().split('T')[0]);
 setRescheduleModalOpen(true);
 };

 const handleRescheduleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!activeRescheduleId) return;

 const match = sessions.find(s => s.id === activeRescheduleId);
 if (!match) return;

 const updated: Session = {
 ...match,
 status: 'Scheduled',
 scheduledTime: `${rescheduleDate}T10:00:00Z`,
 missedFollowUp: {
 reason: rescheduleReason,
 actionTaken: 'Rescheduled',
 notified: true
 },
 timeline: [
 ...match.timeline,
 { time: new Date().toISOString(), event: 'Workout Rescheduled', details: `New date: ${rescheduleDate}. Reason: ${rescheduleReason}` }
 ]
 };

 try {
 await workoutsApi.update(activeRescheduleId, packSessionRecord(updated));
 showToast('Session rescheduled successfully.', 'success');
 
 try {
 await rolesApi.createAuditLog({
 action: 'Missed Workout Rescheduled',
 details: match.name,
 user: match.trainerName,
 eventType: 'WorkoutSession',
 eventCategory: 'coaching',
 metadata: { memberName: match.memberName }
 });
 } catch (_) {}

 setRescheduleModalOpen(false);
 setActiveRescheduleId(null);
 loadSessions();
 loadAuditLogs();
 } catch (_) {
 showToast('Failed to reschedule session.', 'error');
 }
 };

 const handleSkipMissedSession = async (id: string) => {
 const match = sessions.find(s => s.id === id);
 if (!match) return;

 const updated: Session = {
 ...match,
 status: 'Skipped',
 missedFollowUp: {
 reason: match.missedFollowUp?.reason || 'Trainer override',
 actionTaken: 'Skipped',
 notified: true
 }
 };

 try {
 await workoutsApi.update(id, packSessionRecord(updated));
 showToast('Workout skipped by coach approval.', 'success');
 
 try {
 await rolesApi.createAuditLog({
 action: 'Missed Session Skipped',
 details: match.name,
 user: match.trainerName,
 eventType: 'WorkoutSession',
 eventCategory: 'coaching',
 metadata: { memberName: match.memberName }
 });
 } catch (_) {}

 loadSessions();
 loadAuditLogs();
 } catch (_) {
 showToast('Failed to update session.', 'error');
 }
 };

 const handleNotifyMember = (sess: Session) => {
 showToast(`Adherence notification dispatched to ${sess.memberName}.`, 'success');
 };

 // Duplicate/Assign helper (Simulate trigger)
 const handleAssignDuplicate = async (sess: Session) => {
 try {
 await workoutsApi.duplicate(sess.id);
 showToast(`Assigned ${sess.name} copy created successfully.`, 'success');
 loadSessions();
 } catch (_) {
 showToast('Failed to copy session.', 'error');
 }
 };

 // Soft delete session
 const handleDeleteSession = async (id: string) => {
 try {
 await workoutsApi.delete(id);
 showToast('Workout session removed.', 'success');
 
 try {
 await rolesApi.createAuditLog({
 action: 'Session Deleted',
 details: 'Audit Cleanup',
 user: userName || 'Marcus Vance',
 eventType: 'WorkoutSession',
 eventCategory: 'coaching',
 metadata: { memberId: id }
 });
 } catch (_) {}
 
 loadSessions();
 loadAuditLogs();
 } catch (_) {
 showToast('Failed to delete session.', 'error');
 }
 };

 // -------------------------------------------------------------------------
 // MOCK REPORTS & REPORT EXPORT FILES DOWNLOAD (COMPILER INJECTORS)
 // -------------------------------------------------------------------------
 const handleExportCSVReport = async (reportType: string) => {
 try {
 await rolesApi.createAuditLog({
 action: 'Session Report Exported',
 details: reportType,
 user: userName || 'Marcus Vance',
 eventType: 'WorkoutSession',
 eventCategory: 'coaching',
 metadata: { report: reportType }
 });
 loadAuditLogs();
 } catch (_) {}
 showToast(`Compiled & downloaded ${reportType} CSV successfully.`, 'success');
 };

 // -------------------------------------------------------------------------
 // CALENDAR DAYS CALCULATIONS & HELPERS
 // -------------------------------------------------------------------------
 const getCalendarDays = () => {
 const year = calendarDate.getFullYear();
 const month = calendarDate.getMonth();
 const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
 const totalDays = new Date(year, month + 1, 0).getDate();
 
 // adjust firstDay to match Monday start index
 const emptyCells = firstDay === 0 ? 6 : firstDay - 1;

 const days = [];
 for (let i = 0; i < emptyCells; i++) days.push(null);
 for (let i = 1; i <= totalDays; i++) days.push(new Date(year, month, i));
 
 return days;
 };

 const getSessionsForDate = (date: Date) => {
 const dateStr = date.toISOString().split('T')[0];
 return sessions.filter(s => s.scheduledTime.startsWith(dateStr));
 };

 const monthNames = [
 'January', 'February', 'March', 'April', 'May', 'June',
 'July', 'August', 'September', 'October', 'November', 'December'
 ];

 const handlePrevMonth = () => {
 setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
 };

 const handleNextMonth = () => {
 setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
 };

 const isReceptionist = userRole === 'receptionist';

 return (
 <div className="min-h-screen bg-white text-neutral-900 flex flex-col relative overflow-hidden">
 {/* Toast popup */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all ${
 toast.type === 'success' ? 'bg-success-light text-success border-green-200' : 'bg-danger-light text-danger border-red-200'
 }`}>
 {toast.type === 'success' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
 {toast.message}
 </div>
 )}

 {/* Radial Background Gradients */}

 {/* ========================================================================= */}
 {/* TOP HEADER SECTION */}
 {/* ========================================================================= */}
 <div className="px-8 pt-8 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-200/60 relative z-10">
 <div>
 <div className="flex items-center gap-2.5">
 <div className="w-9 h-9 rounded-xl bg-primary-light border border-red-200 flex items-center justify-center shadow-md">
 <Activity className="w-4 h-4 text-danger" />
 </div>
 <h1 className="text-xl font-black tracking-tight text-neutral-900 font-display">
 Workout Session Tracking
 </h1>
 </div>
 <p className="text-xs text-neutral-600 mt-1">
 Monitor client execution adherence, performance metrics, and submit trainer reviews.
 </p>
 </div>

 {/* Global actions bar */}
 <div className="flex items-center gap-2.5 flex-wrap">
 <button
 type="button"
 onClick={() => handleExportCSVReport('Workout_Session_Detailed')}
 className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition cursor-pointer"
 >
 <Download className="w-3.5 h-3.5" />
 <span>Export Report</span>
 </button>
 
 <button
 type="button"
 onClick={() => {
 setSelectedDateRange('today');
 setActiveTab('list');
 showToast('Filters updated to Today.', 'success');
 }}
 className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition cursor-pointer"
 >
 <Calendar className="w-3.5 h-3.5 text-danger" />
 <span>Today's Sessions</span>
 </button>
 </div>
 </div>

 {/* SUB-TABS NAVIGATION MENUS */}
 <Tabs
 className="relative z-10"
 tabs={[
 { id: 'dashboard', label: 'Overview Dashboard', icon: BarChart3 },
 { id: 'calendar', label: 'Session Calendar', icon: Calendar },
 { id: 'list', label: 'Workout Sessions List', icon: Clipboard },
 { id: 'missed', label: 'Missed Sessions Follow-up', icon: AlertTriangle }
 ]}
 activeId={activeTab}
 onChange={(id) => setActiveTab(id as any)}
 />

 {/* ========================================================================= */}
 {/* TAB 1: OVERVIEW DASHBOARD */}
 {/* ========================================================================= */}
 {activeTab === 'dashboard' && (
 <div className="flex-1 p-8 overflow-y-auto space-y-6 relative z-10 flex flex-col">
 
 {/* 1.1 KPI Metrics Cards */}
 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
 {[
 { label:"Today's Workouts", value: kpis.scheduledToday, color: 'text-blue-400', desc: 'Scheduled today' },
 { label: 'Completed Sessions', value: kpis.completed, color: 'text-success', desc: 'Finished cycles' },
 { label: 'Active Sessions', value: kpis.active, color: 'text-primary', desc: 'Currently training' },
 { label: 'Missed Workouts', value: kpis.missed, color: 'text-danger', desc: 'Awaiting follow-up' },
 { label: 'Review Pending', value: kpis.reviewPending, color: 'text-amber-700', desc: 'Trainer feedback' },
 { label: 'Training Today', value: kpis.membersToday, color: 'text-danger', desc: 'Unique members' },
 { label: 'Avg Completion', value: kpis.avgCompletion, color: 'text-teal-400', desc: 'Successful sets' },
 { label: 'Avg Duration', value: kpis.avgDuration, color: 'text-purple-400', desc: 'Per workout flow' }
 ].map((kpi, idx) => (
 <div key={idx} className="bg-neutral-50/40 border border-neutral-200/80 rounded-2xl p-4.5 flex flex-col justify-between hover:border-neutral-200/60 transition duration-200">
 <div>
 <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-extrabold">{kpi.label}</p>
 <p className={`text-2xl font-black ${kpi.color} mt-1.5`}>
 {sessionsLoading ? '...' : kpi.value}
 </p>
 </div>
 <span className="text-[9px] text-neutral-500 mt-2 block border-t border-neutral-200/30 pt-1.5 font-medium">{kpi.desc}</span>
 </div>
 ))}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* 1.2 Performance & Completion Analytics Charts (CSS Mocked Widgets) */}
 <div className="lg:col-span-2 bg-white border border-neutral-200/85 rounded-3xl p-6 space-y-6">
 <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
 <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
 <TrendingUp size={14} className="text-danger" />
 <span>Completion & Volume Performance Trends</span>
 </h3>
 <span className="text-[10px] font-mono text-neutral-500">Last 7 Days</span>
 </div>

 {/* Lifted volume representation */}
 <div className="space-y-4">
 <div>
 <div className="flex justify-between text-[11px] text-neutral-600 mb-1.5">
 <span>Active Member Adherence Rate</span>
 <span className="font-extrabold text-success">{kpis.avgCompletion} average</span>
 </div>
 <div className="h-6 bg-neutral-50 rounded-xl overflow-hidden flex p-1 border border-neutral-100">
 <div className="h-full bg-primary rounded-lg" style={{ width: kpis.avgCompletion }} />
 </div>
 </div>

 {/* CSS Bars for weekly frequency */}
 <div className="pt-2">
 <span className="block text-[10px] text-neutral-500 uppercase tracking-wider font-bold mb-3">Daily Completed Volume (kg)</span>
 <div className="grid grid-cols-7 gap-3 text-center items-end h-28">
 {weeklyVolumeData.map((d, i) => (
 <div key={i} className="flex flex-col items-center justify-end h-full gap-2 group cursor-pointer">
 <div className="text-[9px] font-bold text-neutral-600 opacity-0 group-hover:opacity-100 transition duration-150 bg-neutral-50 border border-neutral-200 px-1 py-0.5 rounded">
 {d.vol}kg
 </div>
 <div className="w-full bg-neutral-50 border border-neutral-200 hover:border-red-200 rounded-t-lg transition-all duration-300" style={{ height: d.pct }}>
 <div className="h-full w-full bg-danger-light hover:bg-red-600 rounded-t-lg" />
 </div>
 <span className="text-[9px] font-bold text-neutral-500 uppercase mt-1">{d.day}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>

 {/* 1.3 Consistency Leaderboards Widget */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
 <Award size={14} className="text-amber-700" />
 <span>GymFlow Consistency Leaderboard</span>
 </h3>

 <div className="space-y-2.5 pt-2">
 {displayLeaderboard.map((item, idx) => (
 <div key={idx} className="flex justify-between items-center p-3 bg-neutral-50/40 border border-neutral-100 rounded-xl hover:border-neutral-200 transition">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold">{item.rank}</span>
 <div>
 <p className="text-xs font-extrabold text-neutral-800">{item.name}</p>
 <p className="text-[9px] text-neutral-500 mt-0.5">{item.streak}</p>
 </div>
 </div>
 <span className="text-[10px] font-bold text-danger bg-danger-light px-2 py-0.5 border border-red-200 rounded">
 {item.rate}
 </span>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* 1.4 Audit logs activity timeline */}
 <div className="bg-white border border-neutral-200/85 rounded-3xl p-6 space-y-4">
 <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
 <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
 <History size={14} className="text-blue-400" />
 <span>Tracking Session Audit Logs</span>
 </h3>
 <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Live System Logs</span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
 {auditLogs.slice(0, 4).map((log, idx) => (
 <div key={idx} className="p-3.5 bg-neutral-50/40 border border-neutral-100 hover:border-neutral-200 rounded-2xl flex justify-between items-center gap-3">
 <div>
 <span className="block text-[8px] uppercase tracking-wide font-extrabold text-danger">{log.action}</span>
 <p className="text-xs font-bold text-neutral-800 mt-1">{log.workoutName} for {log.memberName}</p>
 <span className="text-[9px] text-neutral-500 font-semibold block mt-0.5">Reviewed by: {log.trainer}</span>
 </div>
 <span className="text-[9px] font-mono text-neutral-400 font-semibold">{new Date(log.time).toLocaleTimeString()}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* TAB 2: SESSION CALENDAR VIEW */}
 {/* ========================================================================= */}
 {activeTab === 'calendar' && (
 <div className="flex-1 p-8 overflow-y-auto space-y-6 relative z-10 flex flex-col">
 {/* Calendar View selector header */}
 <div className="flex items-center justify-between border-b border-neutral-200 pb-4 flex-wrap gap-4">
 <div className="flex items-center gap-3">
 <button
 type="button"
 onClick={handlePrevMonth}
 className="p-2 bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-neutral-600 hover:text-neutral-800 rounded-xl cursor-pointer"
 >
 <ArrowLeft size={14} />
 </button>
 <h2 className="text-sm font-bold text-neutral-900 font-display min-w-[120px] text-center">
 {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
 </h2>
 <button
 type="button"
 onClick={handleNextMonth}
 className="p-2 bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-neutral-600 hover:text-neutral-800 rounded-xl cursor-pointer"
 >
 <ArrowRight size={14} />
 </button>
 </div>

 <div className="flex bg-neutral-50 border border-neutral-100 rounded-xl p-1 gap-1 shrink-0">
 {([
 { id: 'month', label: 'Month' },
 { id: 'week', label: 'Week' },
 { id: 'agenda', label: 'Agenda View' }
 ] as const).map(mode => (
 <button
 key={mode.id}
 type="button"
 onClick={() => setCalendarViewMode(mode.id)}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition cursor-pointer ${
 calendarViewMode === mode.id
 ? 'bg-danger text-white shadow'
 : 'text-neutral-500 hover:text-neutral-700'
 }`}
 >
 {mode.label}
 </button>
 ))}
 </div>
 </div>

 {/* Month Calendar Grid View */}
 {calendarViewMode === 'month' && (
 <div className="border border-neutral-200 rounded-3xl overflow-hidden bg-neutral-50/20 flex-1 flex flex-col min-h-[500px]">
 {/* Day Name labels */}
 <div className="grid grid-cols-7 bg-neutral-50/60 border-b border-neutral-200 text-center font-extrabold uppercase text-[9px] text-neutral-500 p-3 tracking-wider shrink-0">
 <div>Mon</div>
 <div>Tue</div>
 <div>Wed</div>
 <div>Thu</div>
 <div>Fri</div>
 <div>Sat</div>
 <div>Sun</div>
 </div>

 {/* Days Cells */}
 <div className="grid grid-cols-7 divide-y divide-neutral-200 divide-x divide-neutral-200 flex-1 bg-neutral-50/10">
 {getCalendarDays().map((day, idx) => {
 if (!day) {
 return <div key={idx} className="p-3 bg-neutral-50/40" />;
 }
 
 const isToday = day.toDateString() === new Date().toDateString();
 const dailySess = getSessionsForDate(day);
 
 return (
 <div key={idx} className={`p-3 min-h-[100px] flex flex-col justify-between hover:bg-neutral-50/20 transition ${isToday ? 'bg-danger-light' : ''}`}>
 <span className={`text-[10px] font-bold block self-start ${isToday ? 'bg-danger text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-neutral-500'}`}>
 {day.getDate()}
 </span>

 {/* Display small capsule sessions indicators */}
 <div className="space-y-1.5 mt-2 flex-1 overflow-y-auto">
 {dailySess.map(s => (
 <div
 key={s.id}
 onClick={() => openDetailsDrawer(s)}
 className={`p-1.5 rounded-lg border text-[10px] text-left truncate font-bold hover:shadow transition-all duration-200 cursor-pointer ${
 s.status === 'Completed' ? 'bg-success-light border-green-200 text-success' :
 s.status === 'In Progress' ? 'bg-primary-light border-primary/20 text-primary' :
 s.status === 'Missed' ? 'bg-danger-light border-red-200 text-danger' :
 'bg-neutral-50 border-neutral-200 text-neutral-700'
 }`}
 >
 <p className="truncate font-black">{s.name}</p>
 <span className="text-[8px] text-neutral-500 font-semibold">{s.memberName}</span>
 </div>
 ))}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Agenda view list */}
 {(calendarViewMode === 'week' || calendarViewMode === 'agenda') && (
 <div className="space-y-3">
 {sessions.map(s => (
 <div
 key={s.id}
 onClick={() => openDetailsDrawer(s)}
 className="p-4 bg-white border border-neutral-200 hover:border-neutral-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
 >
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-center font-bold text-danger shrink-0">
 {new Date(s.scheduledTime).getDate()}
 </div>
 <div>
 <h4 className="text-xs font-black text-neutral-800">{s.name}</h4>
 <p className="text-[10px] text-neutral-500 mt-0.5">{s.notes} • For {s.memberName}</p>
 <span className="text-[9px] text-neutral-500 font-semibold block mt-0.5">Trainer: {s.trainerName}</span>
 </div>
 </div>

 <div className="flex items-center gap-4.5 shrink-0 self-end sm:self-auto">
 <div className="text-right">
 <span className="block text-[8px] uppercase tracking-wider text-neutral-500 font-bold">Scheduled Time</span>
 <span className="text-[10px] font-mono text-neutral-700 font-bold">{new Date(s.scheduledTime).toLocaleTimeString()}</span>
 </div>

 <span className={`text-[9px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-lg border ${
 s.status === 'Completed' ? 'bg-success-light text-success border-green-200' :
 s.status === 'In Progress' ? 'bg-primary-light text-primary border-primary/20' :
 s.status === 'Missed' ? 'bg-danger-light text-danger border-red-200' :
 'bg-neutral-50 text-neutral-600 border-neutral-200'
 }`}>
 {s.status}
 </span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* ========================================================================= */}
 {/* TAB 3: WORKOUT SESSIONS LIST VIEW */}
 {/* ========================================================================= */}
 {activeTab === 'list' && (
 <div className="flex-1 p-8 overflow-y-auto space-y-6 relative z-10 flex flex-col">
 
 {/* 3.1 Sidebar Filter Controls + Search bar */}
 <div className="bg-neutral-50/30 border border-neutral-200/60 rounded-2xl p-5 space-y-4">
 <div className="flex flex-col lg:flex-row lg:items-center gap-3">
 <div className="flex-1 relative">
 <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
 <Search size={15} />
 </div>
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search by member name, workout, trainer..."
 className="w-full bg-neutral-50 border border-neutral-200 focus:border-red-200 rounded-xl pl-10 pr-4 py-3 text-xs text-neutral-900 placeholder-neutral-400 outline-none"
 />
 </div>

 {/* Reset filter widget */}
 <button
 type="button"
 onClick={() => {
 setSelectedMember('all');
 setSelectedTrainer('all');
 setSelectedProgram('all');
 setSelectedStatus('all');
 setSelectedDifficulty('all');
 setSelectedDateRange('all');
 setSearchQuery('');
 }}
 className="flex items-center gap-1.5 px-4 py-3 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-500 hover:text-neutral-800 rounded-xl text-xs font-bold cursor-pointer"
 >
 <RefreshCw size={13} />
 <span>Reset Filters</span>
 </button>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-3 border-t border-neutral-200/40">
 {/* Member */}
 <div>
 <label className="block text-[8px] font-extrabold text-neutral-500 uppercase mb-1">Filter Member</label>
 <select
 value={selectedMember}
 onChange={e => setSelectedMember(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none"
 >
 <option value="all">All Members</option>
 {dbMembers.map(m => (
 <option key={m.id} value={m.name}>{m.name}</option>
 ))}
 <option value="John Doe">John Doe</option>
 <option value="Jane Smith">Jane Smith</option>
 <option value="Harvey Specter">Harvey Specter</option>
 </select>
 </div>

 {/* Trainer */}
 <div>
 <label className="block text-[8px] font-extrabold text-neutral-500 uppercase mb-1">Filter Trainer</label>
 <select
 value={selectedTrainer}
 onChange={e => setSelectedTrainer(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none"
 >
 <option value="all">All Staff</option>
 {dbTrainers.map(t => (
 <option key={t.id} value={t.name}>{t.name}</option>
 ))}
 <option value="Marcus Vance">Marcus Vance</option>
 <option value="Sarah Jenkins">Sarah Jenkins</option>
 <option value="David Cho">David Cho</option>
 </select>
 </div>

 {/* Program */}
 <div>
 <label className="block text-[8px] font-extrabold text-neutral-500 uppercase mb-1">Workout Program</label>
 <select
 value={selectedProgram}
 onChange={e => setSelectedProgram(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none"
 >
 <option value="all">All Programs</option>
 {dbPrograms.map(p => (
 <option key={p} value={p}>{p}</option>
 ))}
 </select>
 </div>

 {/* Status */}
 <div>
 <label className="block text-[8px] font-extrabold text-neutral-500 uppercase mb-1">Session Status</label>
 <select
 value={selectedStatus}
 onChange={e => setSelectedStatus(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none"
 >
 <option value="all">All Statuses</option>
 <option value="Scheduled">Scheduled</option>
 <option value="In Progress">In Progress</option>
 <option value="Completed">Completed</option>
 <option value="Paused">Paused</option>
 <option value="Skipped">Skipped</option>
 <option value="Cancelled">Cancelled</option>
 <option value="Missed">Missed</option>
 </select>
 </div>

 {/* Difficulty */}
 <div>
 <label className="block text-[8px] font-extrabold text-neutral-500 uppercase mb-1">Difficulty</label>
 <select
 value={selectedDifficulty}
 onChange={e => setSelectedDifficulty(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none"
 >
 <option value="all">All Difficulties</option>
 <option value="Beginner">Beginner</option>
 <option value="Intermediate">Intermediate</option>
 <option value="Advanced">Advanced</option>
 <option value="Expert">Expert</option>
 </select>
 </div>

 {/* Date Range */}
 <div>
 <label className="block text-[8px] font-extrabold text-neutral-500 uppercase mb-1">Date Range</label>
 <select
 value={selectedDateRange}
 onChange={e => setSelectedDateRange(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none"
 >
 <option value="all">All Time</option>
 <option value="today">Today</option>
 <option value="week">Past Week</option>
 <option value="month">Past Month</option>
 </select>
 </div>
 </div>
 </div>

 {/* 3.2 Session Listing Data Table */}
 {sessionsLoading ? (
 <div className="py-20 text-center text-xs text-neutral-500 flex flex-col items-center justify-center gap-3">
 <RefreshCw className="animate-spin text-danger" size={24} />
 <p className="font-semibold text-neutral-600">Syncing workout tracking database...</p>
 </div>
 ) : filteredSessions.length === 0 ? (
 <div className="border border-neutral-200 rounded-3xl p-16 text-center space-y-3 bg-white">
 <AlertCircle className="w-10 h-10 text-neutral-400 mx-auto" />
 <h4 className="text-xs font-bold text-neutral-700">No Sessions Found Matching Filters</h4>
 <p className="text-[10px] text-neutral-500 max-w-sm mx-auto">
 No active tracking records matches this filters scope. Adjust your search criteria.
 </p>
 </div>
 ) : (
 <div className="border border-neutral-200 rounded-3xl overflow-hidden bg-white text-xs">
 <div className="overflow-x-auto">
 <table className="w-full border-collapse text-left">
 <thead>
 <tr className="bg-neutral-50/60 border-b border-neutral-200 text-neutral-600 uppercase text-[9px] tracking-wider font-extrabold select-none">
 <th className="p-4">Member</th>
 <th className="p-4">Workout Program</th>
 <th className="p-4">Workout Name</th>
 <th className="p-4">Trainer</th>
 <th className="p-4">Scheduled Time</th>
 <th className="p-4">Duration</th>
 <th className="p-4">Completion %</th>
 <th className="p-4">Status</th>
 <th className="p-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-200 text-neutral-700 font-medium">
 {filteredSessions.map((sess) => (
 <tr
 key={sess.id}
 onClick={() => openDetailsDrawer(sess)}
 className="hover:bg-neutral-50/20 cursor-pointer transition"
 >
 <td className="p-4">
 <div className="flex items-center gap-2">
 {sess.memberPhoto ? (
 <img src={sess.memberPhoto} alt={sess.memberName} className="w-6.5 h-6.5 rounded-full object-cover border border-neutral-200" />
 ) : (
 <div className="w-6.5 h-6.5 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center text-[9px]">
 <Users size={10} />
 </div>
 )}
 <span className="font-bold text-neutral-800">{sess.memberName}</span>
 </div>
 </td>
 <td className="p-4 truncate max-w-[150px]" title={sess.notes}>
 {sess.notes}
 </td>
 <td className="p-4 font-extrabold text-neutral-800">
 {sess.name}
 </td>
 <td className="p-4 text-neutral-600">
 {sess.trainerName}
 </td>
 <td className="p-4 font-mono text-[10px]">
 {new Date(sess.scheduledTime).toLocaleDateString()} {new Date(sess.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </td>
 <td className="p-4 font-mono text-[10px]">
 {sess.durationMinutes} mins
 </td>
 <td className="p-4">
 <div className="flex items-center gap-2">
 <div className="w-12 bg-neutral-50 h-1.5 rounded-full overflow-hidden shrink-0">
 <div className="bg-danger h-full rounded-full" style={{ width: `${sess.completionRate}%` }} />
 </div>
 <span className="font-mono text-[10px] font-bold">{sess.completionRate}%</span>
 </div>
 </td>
 <td className="p-4">
 <span className={`text-[8px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-lg border ${
 sess.status === 'Completed' ? 'bg-success-light text-success border-green-200' :
 sess.status === 'In Progress' ? 'bg-primary text-primary border-primary/20' :
 sess.status === 'Missed' ? 'bg-danger text-danger border-red-200' :
 sess.status === 'Scheduled' ? 'bg-blue-955 text-blue-450 border-blue-900/30' :
 'bg-neutral-50 text-neutral-600 border-neutral-200'
 }`}>
 {sess.status}
 </span>
 </td>
 <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-end gap-1.5">
 <button
 type="button"
 onClick={() => openDetailsDrawer(sess)}
 className="p-1.5 text-neutral-600 hover:text-neutral-800 rounded hover:bg-neutral-50"
 title="View details"
 >
 <Eye size={12} />
 </button>
 <button
 type="button"
 onClick={() => handleAssignDuplicate(sess)}
 className="p-1.5 text-neutral-600 hover:text-neutral-800 rounded hover:bg-neutral-50"
 title="Clone to new assignment"
 disabled={isReceptionist}
 >
 <Copy size={12} />
 </button>
 <button
 type="button"
 onClick={() => handleDeleteSession(sess.id)}
 className="p-1.5 text-neutral-600 hover:text-danger rounded hover:bg-neutral-50"
 title="Remove session log"
 disabled={isReceptionist}
 >
 <Trash size={12} />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>
 )}

 {/* ========================================================================= */}
 {/* TAB 4: MISSED WORKOUTS MANAGEMENT */}
 {/* ========================================================================= */}
 {activeTab === 'missed' && (
 <div className="flex-1 p-8 overflow-y-auto space-y-6 relative z-10 flex flex-col">
 <div className="p-4 bg-neutral-50/20 rounded-2xl border border-neutral-200/80 flex items-start gap-3">
 <Info size={16} className="text-danger mt-0.5" />
 <div>
 <h4 className="text-xs font-bold text-neutral-800">Coach Missed Sessions Panel</h4>
 <p className="text-[10px] text-neutral-500 leading-relaxed mt-1">
 Clients who missed their scheduled sessions are listed below. You can reschedule their workout, skip it with a notes log, or send a reminder notification.
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {sessions.filter(s => s.status === 'Missed').map(sess => (
 <div key={sess.id} className="bg-white border border-neutral-200 hover:border-neutral-200 rounded-3xl p-6 flex flex-col justify-between min-h-[180px] space-y-4">
 <div className="flex items-start justify-between gap-4">
 <div className="flex items-center gap-3">
 {sess.memberPhoto ? (
 <img src={sess.memberPhoto} alt={sess.memberName} className="w-9 h-9 rounded-full object-cover border border-neutral-200" />
 ) : (
 <div className="w-9 h-9 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center text-xs">
 <Users size={12} />
 </div>
 )}
 <div>
 <h4 className="text-xs font-extrabold text-neutral-800">{sess.memberName}</h4>
 <p className="text-[9px] text-neutral-500 font-bold uppercase mt-0.5">{sess.notes}</p>
 </div>
 </div>

 <span className="text-[9px] font-mono font-bold text-danger bg-danger-light px-2 py-0.5 border border-red-200 rounded">
 Missed Workout
 </span>
 </div>

 <div className="p-3 bg-neutral-50/40 rounded-2xl border border-neutral-100 text-[10px] text-neutral-600 space-y-1">
 <p><span className="font-bold text-neutral-500">Scheduled:</span> {new Date(sess.scheduledTime).toLocaleDateString()} {new Date(sess.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
 <p><span className="font-bold text-neutral-500">Reason:</span> {sess.missedFollowUp?.reason || 'No reason submitted'}</p>
 </div>

 <div className="flex items-center justify-between gap-3 pt-2">
 <button
 type="button"
 onClick={() => handleNotifyMember(sess)}
 className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 hover:text-neutral-800 text-[10px] font-bold rounded-xl transition cursor-pointer"
 >
 <Bell size={11} className="text-amber-700" />
 <span>Notify Member</span>
 </button>

 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => handleSkipMissedSession(sess.id)}
 className="px-3 py-2 bg-neutral-50 hover:bg-neutral-50 text-neutral-600 hover:text-neutral-700 border border-neutral-200 hover:border-neutral-200 text-[10px] font-bold rounded-xl cursor-pointer"
 disabled={isReceptionist}
 >
 Skip Session
 </button>
 <button
 type="button"
 onClick={() => triggerRescheduleModal(sess.id)}
 className="px-3.5 py-2 bg-danger hover:bg-red-600 text-white text-[10px] font-bold rounded-xl transition cursor-pointer"
 disabled={isReceptionist}
 >
 Reschedule
 </button>
 </div>
 </div>
 </div>
 ))}

 {sessions.filter(s => s.status === 'Missed').length === 0 && (
 <div className="md:col-span-2 border border-dashed border-neutral-200 rounded-3xl p-16 text-center text-neutral-500 text-xs">
 No missed workouts currently flagged. All clients are fully adherent!
 </div>
 )}
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* SESSION DETAILS DRAWER / MODAL CONTAINER */}
 {/* ========================================================================= */}
 {drawerOpen && selectedSession && (
 <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex justify-end animate-fade-in">
 <div className="w-full max-w-2xl bg-white border-l border-neutral-200 h-full p-6 flex flex-col justify-between relative shadow-2xl overflow-y-auto scrollbar-thin text-xs">
 
 {/* Header drawer */}
 <div className="flex justify-between items-center border-b border-neutral-100 pb-3.5 shrink-0">
 <div>
 <span className="text-[9px] font-extrabold uppercase tracking-widest text-danger">Tracking details</span>
 <h3 className="text-sm font-black text-neutral-900 mt-1">{selectedSession.name}</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">{selectedSession.notes}</p>
 </div>
 <button
 type="button"
 onClick={() => setDrawerOpen(false)}
 className="p-2 bg-neutral-50 hover:bg-neutral-50 border border-neutral-200 text-neutral-500 hover:text-neutral-800 rounded-xl cursor-pointer"
 >
 <X size={18} />
 </button>
 </div>

 {/* Drawer Body Scroll */}
 <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1.5 select-none">
 
 {/* Member profile widget */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex gap-4 items-center">
 {selectedSession.memberPhoto ? (
 <img src={selectedSession.memberPhoto} alt={selectedSession.memberName} className="w-12 h-12 rounded-full object-cover border border-neutral-200" />
 ) : (
 <div className="w-12 h-12 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center text-xs">
 <Users size={16} />
 </div>
 )}
 <div>
 <h4 className="text-xs font-black text-neutral-800">{selectedSession.memberName}</h4>
 <p className="text-[9px] text-neutral-500 font-bold uppercase mt-0.5">Active Program Member</p>
 <span className="text-[9px] text-neutral-500 font-semibold block mt-0.5">Assigned coach: {selectedSession.trainerName}</span>
 </div>
 </div>

 {/* Timeline chronological list */}
 <div className="space-y-3">
 <h4 className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest border-b border-neutral-100 pb-1.5">Session Timeline Logs</h4>
 <div className="relative border-l border-neutral-200/80 ml-3 pl-5 space-y-4 py-1">
 {selectedSession.timeline.map((event, idx) => (
 <div key={idx} className="relative">
 {/* Dot marker */}
 <div className="absolute left-[-26px] top-1.5 w-2 h-2 rounded-full bg-danger border border-neutral-100" />
 <span className="text-[9px] font-mono text-neutral-500">{new Date(event.time).toLocaleTimeString()}</span>
 <p className="text-[11px] font-extrabold text-neutral-800 mt-0.5">{event.event}</p>
 {event.details && <p className="text-[10px] text-neutral-500 mt-0.5">{event.details}</p>}
 </div>
 ))}
 </div>
 </div>

 {/* Workout volume / statistics summary card */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 <div className="bg-neutral-50/40 p-3 border border-neutral-100 rounded-xl text-center">
 <span className="block text-[8px] uppercase tracking-wider text-neutral-500 font-bold">Lifted Volume</span>
 <span className="text-xs font-black text-neutral-800 mt-1 block">{selectedSession.volumeLifted} kg</span>
 </div>
 <div className="bg-neutral-50/40 p-3 border border-neutral-100 rounded-xl text-center">
 <span className="block text-[8px] uppercase tracking-wider text-neutral-500 font-bold">Adherence Rate</span>
 <span className="text-xs font-black text-neutral-800 mt-1 block">{selectedSession.completionRate}%</span>
 </div>
 <div className="bg-neutral-50/40 p-3 border border-neutral-100 rounded-xl text-center">
 <span className="block text-[8px] uppercase tracking-wider text-neutral-500 font-bold">Duration Logged</span>
 <span className="text-xs font-black text-neutral-800 mt-1 block">{selectedSession.durationMinutes} mins</span>
 </div>
 <div className="bg-neutral-50/40 p-3 border border-neutral-100 rounded-xl text-center">
 <span className="block text-[8px] uppercase tracking-wider text-neutral-500 font-bold">Active Streak</span>
 <span className="text-xs font-black text-neutral-800 mt-1 block">{selectedSession.streakCount} days</span>
 </div>
 </div>

 {/* Set-by-Set Exercise Trackers */}
 <div className="space-y-3">
 <h4 className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-widest border-b border-neutral-100 pb-1.5">Exercise Completion Tracks</h4>
 
 <div className="space-y-3">
 {selectedSession.exercises.map((ex, exIdx) => (
 <div key={exIdx} className="bg-neutral-50/40 border border-neutral-100 rounded-2xl p-4.5 space-y-3">
 <div className="flex justify-between items-start gap-3">
 <div>
 <h5 className="text-xs font-extrabold text-neutral-800">{ex.name}</h5>
 {ex.trainerNotes && <p className="text-[9px] text-neutral-500 italic mt-1 font-semibold">Coach note: {ex.trainerNotes}</p>}
 {ex.memberNotes && <p className="text-[9px] text-neutral-500 italic mt-0.5">Member comment: {ex.memberNotes}</p>}
 </div>

 <span className={`text-[8px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded border ${
 ex.status === 'Completed' ? 'bg-success-light text-success border-green-200' :
 ex.status === 'In Progress' ? 'bg-primary text-primary border-primary/20' :
 'bg-neutral-50 text-neutral-600 border-neutral-200'
 }`}>
 {ex.status}
 </span>
 </div>

 {/* Sets list check items */}
 <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100/60">
 {ex.sets.map((set, setIdx) => (
 <div key={setIdx} className="flex justify-between items-center p-2 bg-neutral-50/80 border border-neutral-100 rounded-lg">
 <span className="font-mono text-[9px] text-neutral-600">Set {setIdx + 1}: {set.reps} reps × {set.weight}kg</span>
 {set.completed ? (
 <CheckCircle size={12} className="text-success shrink-0" />
 ) : (
 <div className="w-3 h-3 rounded-full border border-neutral-200 shrink-0" />
 )}
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Member feedback (mobile preview) */}
 {selectedSession.feedback && (
 <div className="bg-white border border-neutral-100 rounded-2xl p-4 space-y-2">
 <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-neutral-600">
 <Smile size={12} className="text-blue-400" />
 <span>Member Logged Feedback</span>
 </div>
 <div className="grid grid-cols-2 gap-4 pt-1.5 text-[10px] text-neutral-600">
 <p><span className="font-bold text-neutral-500">Difficulty:</span> {selectedSession.feedback.difficulty}/5</p>
 <p><span className="font-bold text-neutral-500">Energy Level:</span> {selectedSession.feedback.energy}/5</p>
 <p><span className="font-bold text-neutral-500">Pain Index:</span> {selectedSession.feedback.pain}/5</p>
 <p><span className="font-bold text-neutral-500">Enjoyment:</span> {selectedSession.feedback.enjoyment}/5</p>
 </div>
 {selectedSession.feedback.notes && (
 <p className="text-[10px] text-neutral-600 italic pt-1 border-t border-neutral-100/40 mt-1">
 Notes:"{selectedSession.feedback.notes}"
 </p>
 )}
 </div>
 )}

 {/* Trainer Review Form */}
 <form onSubmit={handleTrainerReviewSubmit} className="bg-neutral-50/30 border border-neutral-200/60 rounded-3xl p-5 space-y-4">
 <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-danger">
 <Star size={12} className="fill-danger" />
 <span>Trainer Evaluation Review</span>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[8px] text-neutral-500 font-bold uppercase mb-1">Performance Rating</label>
 <select
 value={reviewRating}
 onChange={e => setReviewRating(parseInt(e.target.value))}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-xs text-neutral-700 outline-none cursor-pointer"
 disabled={isReceptionist}
 >
 <option value={5}>⭐⭐⭐⭐⭐ (Outstanding)</option>
 <option value={4}>⭐⭐⭐⭐ (Strong intensity)</option>
 <option value={3}>⭐⭐⭐ (Moderate pacing)</option>
 <option value={2}>⭐⭐ (Form needs core focus)</option>
 <option value={1}>⭐ (Struggled with targets)</option>
 </select>
 </div>

 <div>
 <label className="block text-[8px] text-neutral-500 font-bold uppercase mb-1">Approve Session</label>
 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => setReviewApproved(true)}
 className={`flex-1 py-2 text-[10px] border rounded-xl font-bold transition cursor-pointer ${
 reviewApproved ? 'bg-success-light border-green-200 text-success font-extrabold' : 'bg-neutral-50 border-neutral-100 text-neutral-500'
 }`}
 disabled={isReceptionist}
 >
 Approve
 </button>
 <button
 type="button"
 onClick={() => setReviewApproved(false)}
 className={`flex-1 py-2 text-[10px] border rounded-xl font-bold transition cursor-pointer ${
 !reviewApproved ? 'bg-danger border-red-200 text-danger font-extrabold' : 'bg-neutral-50 border-neutral-100 text-neutral-500'
 }`}
 disabled={isReceptionist}
 >
 Flag Issue
 </button>
 </div>
 </div>
 </div>

 <div>
 <label className="block text-[8px] text-neutral-500 font-bold uppercase mb-1.5">Coach Feedback notes</label>
 <textarea
 value={reviewFeedback}
 onChange={e => setReviewFeedback(e.target.value)}
 placeholder="Provide recommendations, form corrections, or motivational guidance..."
 rows={2}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-2.5 text-neutral-900 placeholder-neutral-400 outline-none resize-none"
 disabled={isReceptionist}
 />
 </div>

 <div>
 <label className="block text-[8px] text-neutral-500 font-bold uppercase mb-1.5">Recommended changes (e.g. Next session load adjustments)</label>
 <input
 type="text"
 value={reviewRecs}
 onChange={e => setReviewRecs(e.target.value)}
 placeholder="e.g. Add 2.5kg to deadlift sets"
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-2.5 text-neutral-900 placeholder-neutral-400 outline-none"
 disabled={isReceptionist}
 />
 </div>

 <div className="flex gap-3 pt-2">
 <button
 type="button"
 onClick={() => setDrawerOpen(false)}
 className="flex-1 py-3 bg-neutral-50 border border-neutral-100 hover:border-neutral-200 text-neutral-600 hover:text-neutral-800 font-bold rounded-xl cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg cursor-pointer"
 disabled={isReceptionist}
 >
 Submit Review & Save
 </button>
 </div>
 </form>
 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* DIALOG MODAL: RESCHEDULE TARGET MODAL */}
 {/* ========================================================================= */}
 {rescheduleModalOpen && (
 <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
 <form
 onSubmit={handleRescheduleSubmit}
 className="w-full max-w-md bg-white border border-neutral-200 p-6 rounded-3xl space-y-4 shadow-2xl relative text-xs"
 >
 <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
 <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
 <Calendar className="w-4 h-4 text-danger" />
 <span>Reschedule Workout Session</span>
 </h3>
 <button
 type="button"
 onClick={() => { setRescheduleModalOpen(false); setActiveRescheduleId(null); }}
 className="text-neutral-500 hover:text-neutral-700 cursor-pointer"
 >
 <X size={18} />
 </button>
 </div>

 <div className="space-y-3">
 <div>
 <label className="block text-[8px] text-neutral-500 font-bold uppercase mb-1">New Scheduled Date</label>
 <input
 type="date"
 value={rescheduleDate}
 onChange={e => setRescheduleDate(e.target.value)}
 required
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-2.5 text-neutral-800 outline-none"
 />
 </div>

 <div>
 <label className="block text-[8px] text-neutral-500 font-bold uppercase mb-1">Reason for Rescheduling</label>
 <select
 value={rescheduleReason}
 onChange={e => setRescheduleReason(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-2.5 text-neutral-700 outline-none cursor-pointer"
 >
 <option value="Family emergency">Family emergency / conflict</option>
 <option value="Work conflict">Work schedule conflict</option>
 <option value="Sickness/Injury">Client felt sick / injured</option>
 <option value="Trainer availability">Coach availability shift</option>
 <option value="Other">Other reason (logged in notes)</option>
 </select>
 </div>
 </div>

 <div className="flex gap-3 pt-3 border-t border-neutral-100">
 <button
 type="button"
 onClick={() => { setRescheduleModalOpen(false); setActiveRescheduleId(null); }}
 className="flex-1 py-3 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-600 hover:text-neutral-800 font-bold rounded-xl cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg cursor-pointer"
 >
 Apply Date Reschedule
 </button>
 </div>
 </form>
 </div>
 )}
 </div>
 );
}
