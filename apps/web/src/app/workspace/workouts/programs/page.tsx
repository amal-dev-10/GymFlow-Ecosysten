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
 Layers, Smile, AlertCircle
} from 'lucide-react';
import { workoutsApi } from '../../../../lib/api';
import { Tabs } from '../../../../components/ui';

// Definitions
interface Program {
 id: string;
 name: string;
 subtitle: string;
 goal: string;
 description: string;
 coverImage: string;
 difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
 durationWeeks: number;
 estimatedSessions: number;
 caloriesFocus: number;
 visibility: 'Private' | 'Organization' | 'Community' | 'Marketplace';
 status: 'Draft' | 'Published' | 'Archived';
 isFavorite: boolean;
 trainerName: string;
 tags: string[];
 equipmentRequired: string[];
 weeks: {
 [weekIndex: number]: {
 [dayIndex: number]: { // 0 = Mon, 1 = Tue, etc.
 type: 'Workout' | 'Cardio' | 'Stretching' | 'Mobility' | 'Rest' | 'Assessment' | 'Challenge';
 workoutTemplateId?: string;
 workoutTemplateName?: string;
 details?: string;
 overloadSets?: number;
 overloadReps?: string;
 overloadWeightInc?: number;
 overloadRestDec?: number;
 tempo?: string;
 recoveryType?: 'Complete Rest' | 'Active Recovery' | 'Stretching' | 'Walking' | 'Yoga' | 'Mobility';
 };
 };
 };
 versions: {
 id: string;
 version: string;
 description: string;
 createdAt: string;
 }[];
}

function packProgramRecord(prog: Program) {
 return {
 name: prog.name,
 type: 'Program',
 difficulty: prog.difficulty,
 duration: prog.durationWeeks,
 calories: prog.estimatedSessions,
 visibility: prog.visibility,
 status: prog.status,
 notes: prog.subtitle,
 memberNotes: prog.description,
 prepNotes: prog.coverImage,
 isTemplate: false,
 isFavorite: prog.isFavorite,
 equipmentNotes: prog.equipmentRequired.join(','),
 structure: [
 {
 weeks: prog.weeks,
 tags: prog.tags,
 equipmentRequired: prog.equipmentRequired,
 goal: prog.goal
 }
 ]
 };
}

function unpackProgramRecord(record: any): Program {
 const struct = Array.isArray(record.structure) ? record.structure[0] : (record.structure || {});
 const weeks = struct?.weeks || {};
 const tags = struct?.tags || [];
 const equipmentRequired = struct?.equipmentRequired || (record.equipmentNotes ? record.equipmentNotes.split(',') : []);
 const goal = struct?.goal || 'General Fitness';

 return {
 id: record.id,
 name: record.name,
 subtitle: record.notes || '',
 goal: goal,
 description: record.memberNotes || '',
 coverImage: record.prepNotes || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=400&h=250',
 difficulty: record.difficulty || 'Beginner',
 durationWeeks: record.duration || 4,
 estimatedSessions: record.calories || 0,
 caloriesFocus: 2500,
 visibility: record.visibility || 'Private',
 status: record.status || 'Draft',
 isFavorite: record.isFavorite || false,
 trainerName: record.creator?.fullName || 'Marcus Vance',
 tags: tags,
 equipmentRequired: equipmentRequired,
 weeks: weeks,
 versions: []
 };
}

const FIT_GOALS = [
 'Fat Loss', 'Muscle Gain', 'Strength', 'Hypertrophy', 'Endurance',
 'Athletic Performance', 'Rehabilitation', 'Mobility', 'General Fitness',
 'Senior Fitness', 'Post Pregnancy', 'Sports Specific', 'Custom Goal'
];

const TAG_OPTIONS = [
 'Beginner', 'Gym', 'Home', 'Bodybuilding', 'Fat Loss', 'Strength',
 'Powerlifting', 'HIIT', 'Women\'s Fitness', 'Athlete', 'Mobility', 'Rehab'
];

export default function WorkoutProgramsPage() {
 const router = useRouter();

 // Active view: 'dashboard' | 'builder' | 'analytics'
 const [currentView, setCurrentView] = useState<'dashboard' | 'builder' | 'analytics'>('dashboard');

 // Search & Filters
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedGoal, setSelectedGoal] = useState('all');
 const [selectedDifficulty, setSelectedDifficulty] = useState('all');
 const [selectedDuration, setSelectedDuration] = useState('all');
 const [selectedStatus, setSelectedStatus] = useState('all');
 const [selectedVisibility, setSelectedVisibility] = useState('all');

 // Programs Data
 const [programs, setPrograms] = useState<Program[]>([]);
 const [programsLoading, setProgramsLoading] = useState(false);
 const [editingProgram, setEditingProgram] = useState<Program | null>(null);

 // Template Library (from API + Mock fallback)
 const [workoutTemplates, setWorkoutTemplates] = useState<any[]>([]);
 const [templatesLoading, setTemplatesLoading] = useState(false);

 // Form State for creating/editing Program settings
 const [formName, setFormName] = useState('');
 const [formSubtitle, setFormSubtitle] = useState('');
 const [formGoal, setFormGoal] = useState('General Fitness');
 const [formDesc, setFormDesc] = useState('');
 const [formCover, setFormCover] = useState('');
 const [formDifficulty, setFormDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'>('Beginner');
 const [formWeeks, setFormWeeks] = useState(4);
 const [formVisibility, setFormVisibility] = useState<'Private' | 'Organization' | 'Community' | 'Marketplace'>('Private');
 const [formStatus, setFormStatus] = useState<'Draft' | 'Published' | 'Archived'>('Draft');
 const [formTags, setFormTags] = useState<string[]>([]);
 const [formEquipment, setFormEquipment] = useState<string[]>([]);

 // Drag and Drop active item
 const [draggedTemplate, setDraggedTemplate] = useState<{ id: string; name: string } | null>(null);

 // Assignment Modal / Details form
 const [assignModalOpen, setAssignModalOpen] = useState(false);
 const [activeAssignCell, setActiveAssignCell] = useState<{ week: number; day: number } | null>(null);
 const [assignType, setAssignType] = useState<'Workout' | 'Cardio' | 'Stretching' | 'Mobility' | 'Rest' | 'Assessment' | 'Challenge'>('Workout');
 const [assignTemplateId, setAssignTemplateId] = useState('');
 const [assignDetails, setAssignDetails] = useState('');
 const [assignOverloadSets, setAssignOverloadSets] = useState(3);
 const [assignOverloadReps, setAssignOverloadReps] = useState('10');
 const [assignOverloadWeightInc, setAssignOverloadWeightInc] = useState(0);
 const [assignOverloadRestDec, setAssignOverloadRestDec] = useState(0);
 const [assignTempo, setAssignTempo] = useState('');
 const [assignRecoveryType, setAssignRecoveryType] = useState<'Complete Rest' | 'Active Recovery' | 'Stretching' | 'Walking' | 'Yoga' | 'Mobility'>('Complete Rest');

 // Preview Mode
 const [isPreviewActive, setIsPreviewActive] = useState(false);
 const [previewTab, setPreviewTab] = useState<'week' | 'calendar' | 'timeline'>('week');
 const [selectedPreviewWeek, setSelectedPreviewWeek] = useState(0);

 // Version Control History Modal
 const [versionModalOpen, setVersionModalOpen] = useState(false);

 // Publish Workflow Modal
 const [publishModalOpen, setPublishModalOpen] = useState(false);
 const [publishPrice, setPublishPrice] = useState('0');

 // Progressive Overload Builder Panel Toggle
 const [overloadPanelOpen, setOverloadPanelOpen] = useState(false);
 const [bulkSetsProgression, setBulkSetsProgression] = useState('+0');
 const [bulkRepsProgression, setBulkRepsProgression] = useState('+0');
 const [bulkWeightProgression, setBulkWeightProgression] = useState('+2.5kg');
 const [bulkRestProgression, setBulkRestProgression] = useState('-10s');

 // User details
 const [userRole, setUserRole] = useState('trainer');
 const [userName, setUserName] = useState('');
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 const showToast = (message: string, type: 'success' | 'error') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 const loadPrograms = useCallback(async () => {
 try {
 setProgramsLoading(true);
 const res = await workoutsApi.list({ isTemplate: false });
 if (res?.workouts) {
 const progs = res.workouts
 .filter((w: any) => w.type === 'Program')
 .map(unpackProgramRecord);
 setPrograms(progs);
 }
 } catch (_) {
 showToast('Failed to load workout programs.', 'error');
 } finally {
 setProgramsLoading(false);
 }
 }, []);

 // Load user role and workout templates
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

 const fetchTemplates = async () => {
 try {
 setTemplatesLoading(true);
 const res = await workoutsApi.list({ isTemplate: true });
 if (res?.workouts) {
 setWorkoutTemplates(res.workouts);
 } else {
 // Fallback static templates
 setWorkoutTemplates([
 { id: 'wt-1', name: 'Upper Body Hypertrophy (A)', type: 'Strength', difficulty: 'Intermediate' },
 { id: 'wt-2', name: 'Lower Body Strength Max (B)', type: 'Strength', difficulty: 'Advanced' },
 { id: 'wt-3', name: 'Full Body Aerobic Conditioning', type: 'Cardio', difficulty: 'Beginner' },
 { id: 'wt-4', name: 'Posterior Chain Activation', type: 'Mobility', difficulty: 'Beginner' },
 { id: 'wt-5', name: 'HIIT Tabata Core Killer', type: 'HIIT', difficulty: 'Advanced' },
 { id: 'wt-6', name: 'Thoracic Mobility & Yoga Flow', type: 'Stretching', difficulty: 'Beginner' }
 ]);
 }
 } catch (_) {
 setWorkoutTemplates([
 { id: 'wt-1', name: 'Upper Body Hypertrophy (A)', type: 'Strength', difficulty: 'Intermediate' },
 { id: 'wt-2', name: 'Lower Body Strength Max (B)', type: 'Strength', difficulty: 'Advanced' },
 { id: 'wt-3', name: 'Full Body Aerobic Conditioning', type: 'Cardio', difficulty: 'Beginner' },
 { id: 'wt-4', name: 'Posterior Chain Activation', type: 'Mobility', difficulty: 'Beginner' },
 { id: 'wt-5', name: 'HIIT Tabata Core Killer', type: 'HIIT', difficulty: 'Advanced' }
 ]);
 } finally {
 setTemplatesLoading(false);
 }
 };

 fetchTemplates();
 loadPrograms();
 }, [loadPrograms]);


 // Dashboard KPI Metrics
 const stats = {
 total: programs.length,
 published: programs.filter(p => p.status === 'Published').length,
 draft: programs.filter(p => p.status === 'Draft').length,
 favorites: programs.filter(p => p.isFavorite).length,
 community: programs.filter(p => p.visibility === 'Community' || p.visibility === 'Marketplace').length,
 assigned: 14 // Mocked count of active client assignments
 };

 // Filters application
 const filteredPrograms = programs.filter(prog => {
 const matchesSearch = prog.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 prog.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
 prog.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
 const matchesGoal = selectedGoal === 'all' || prog.goal === selectedGoal;
 const matchesDiff = selectedDifficulty === 'all' || prog.difficulty === selectedDifficulty;
 const matchesStatus = selectedStatus === 'all' || prog.status === selectedStatus;
 const matchesVis = selectedVisibility === 'all' || prog.visibility === selectedVisibility;

 let matchesDuration = true;
 if (selectedDuration !== 'all') {
 const weeks = prog.durationWeeks;
 if (selectedDuration === 'short') matchesDuration = weeks <= 4;
 else if (selectedDuration === 'medium') matchesDuration = weeks > 4 && weeks <= 8;
 else if (selectedDuration === 'long') matchesDuration = weeks > 8;
 }

 return matchesSearch && matchesGoal && matchesDiff && matchesStatus && matchesVis && matchesDuration;
 });

 // Handle program duplicate
 const handleDuplicate = async (id: string, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 try {
 await workoutsApi.duplicate(id);
 showToast('Program duplicated successfully.', 'success');
 loadPrograms();
 } catch (_) {
 showToast('Failed to duplicate program.', 'error');
 }
 };

 // Handle program delete/archive
 const handleToggleArchive = async (id: string, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 const prog = programs.find(p => p.id === id);
 if (!prog) return;

 try {
 const nextStatus = prog.status === 'Archived' ? 'Draft' : 'Archived';
 await workoutsApi.update(id, { status: nextStatus });
 showToast(nextStatus === 'Archived' ? 'Program archived.' : 'Program restored to drafts.', 'success');
 loadPrograms();
 } catch (_) {
 showToast('Failed to update status.', 'error');
 }
 };

 // Toggle Favorite status
 const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
 e.stopPropagation();
 const prog = programs.find(p => p.id === id);
 if (!prog) return;

 try {
 await workoutsApi.update(id, { isFavorite: !prog.isFavorite });
 showToast('Favorites updated.', 'success');
 loadPrograms();
 } catch (_) {
 showToast('Failed to update favorites.', 'error');
 }
 };

 // Open Program Builder (New or Edit)
 const openBuilder = async (prog: Program | null) => {
 if (prog) {
 setEditingProgram(prog);
 setFormName(prog.name);
 setFormSubtitle(prog.subtitle);
 setFormGoal(prog.goal);
 setFormDesc(prog.description);
 setFormCover(prog.coverImage);
 setFormDifficulty(prog.difficulty);
 setFormWeeks(prog.durationWeeks);
 setFormVisibility(prog.visibility);
 setFormStatus(prog.status);
 setFormTags(prog.tags);
 setFormEquipment(prog.equipmentRequired || []);

 // Fetch versions dynamically from backend for this program
 try {
 const versionsRes = await workoutsApi.getVersions(prog.id);
 if (Array.isArray(versionsRes)) {
 setEditingProgram(prev => {
 if (!prev) return null;
 return {
 ...prev,
 versions: versionsRes.map((v: any) => ({
 id: v.id,
 version: `v1.${v.versionNumber}`,
 description: v.notes || 'Saved update',
 createdAt: v.createdAt
 }))
 };
 });
 }
 } catch (_) {}
 } else {
 // Initialize a new program draft
 setEditingProgram({
 id: `prog-${Date.now()}`,
 name: 'New Training Program',
 subtitle: 'Add a subtitle',
 goal: 'General Fitness',
 description: 'Describe the program guidelines...',
 coverImage: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=400&h=250',
 difficulty: 'Beginner',
 durationWeeks: 4,
 estimatedSessions: 0,
 caloriesFocus: 2500,
 visibility: 'Private',
 status: 'Draft',
 isFavorite: false,
 trainerName: userName || 'Marcus Vance',
 tags: ['Gym', 'Beginner'],
 equipmentRequired: ['Dumbbell'],
 weeks: {},
 versions: [{ id: 'v1', version: 'v1.0', description: 'Created program', createdAt: new Date().toISOString() }]
 });
 setFormName('New Training Program');
 setFormSubtitle('Build a core training foundation');
 setFormGoal('General Fitness');
 setFormDesc('Describe the program guidelines...');
 setFormCover('https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=400&h=250');
 setFormDifficulty('Beginner');
 setFormWeeks(4);
 setFormVisibility('Private');
 setFormStatus('Draft');
 setFormTags(['Gym', 'Beginner']);
 setFormEquipment(['Dumbbell']);
 }
 setCurrentView('builder');
 setIsPreviewActive(false);
 };

 // Close Builder and Save Program
 const handleSaveProgram = async () => {
 if (!editingProgram) return;

 // Check sessions count
 let totalSessions = 0;
 Object.values(editingProgram.weeks).forEach(week => {
 Object.values(week).forEach(day => {
 if (day.type && day.type !== 'Rest') totalSessions++;
 });
 });

 const targetProgram: Program = {
 ...editingProgram,
 name: formName,
 subtitle: formSubtitle,
 goal: formGoal,
 description: formDesc,
 coverImage: formCover,
 difficulty: formDifficulty,
 durationWeeks: formWeeks,
 visibility: formVisibility,
 status: formStatus,
 tags: formTags,
 equipmentRequired: formEquipment,
 estimatedSessions: totalSessions
 };

 const payload = packProgramRecord(targetProgram);

 try {
 const isNew = editingProgram.id.startsWith('prog-');
 if (isNew) {
 await workoutsApi.create(payload);
 } else {
 await workoutsApi.update(editingProgram.id, payload);
 }
 showToast('Workout program saved successfully.', 'success');
 setEditingProgram(null);
 setCurrentView('dashboard');
 loadPrograms();
 } catch (_) {
 showToast('Failed to save workout program.', 'error');
 }
 };

 // Drag-and-drop support
 const handleDragStart = (id: string, name: string) => {
 setDraggedTemplate({ id, name });
 };

 const handleCellDrop = (weekIdx: number, dayIdx: number) => {
 if (!editingProgram || !draggedTemplate) return;

 const nextWeeks = { ...editingProgram.weeks };
 if (!nextWeeks[weekIdx]) nextWeeks[weekIdx] = {};

 nextWeeks[weekIdx][dayIdx] = {
 type: 'Workout',
 workoutTemplateId: draggedTemplate.id,
 workoutTemplateName: draggedTemplate.name,
 overloadSets: 3,
 overloadReps: '10',
 overloadWeightInc: 0,
 overloadRestDec: 0
 };

 setEditingProgram({ ...editingProgram, weeks: nextWeeks });
 setDraggedTemplate(null);
 showToast(`Added ${draggedTemplate.name} to Day ${dayIdx + 1}, Week ${weekIdx + 1}.`, 'success');
 };

 const handleCellClick = (weekIdx: number, dayIdx: number) => {
 if (!editingProgram) return;

 setActiveAssignCell({ week: weekIdx, day: dayIdx });
 const cell = editingProgram.weeks[weekIdx]?.[dayIdx] || { type: 'Rest' };

 setAssignType(cell.type);
 setAssignTemplateId(cell.workoutTemplateId || '');
 setAssignDetails(cell.details || '');
 setAssignOverloadSets(cell.overloadSets || 3);
 setAssignOverloadReps(cell.overloadReps || '10');
 setAssignOverloadWeightInc(cell.overloadWeightInc || 0);
 setAssignOverloadRestDec(cell.overloadRestDec || 0);
 setAssignTempo(cell.tempo || '');
 setAssignRecoveryType(cell.recoveryType || 'Complete Rest');

 setAssignModalOpen(true);
 };

 // Submit Day Assignment Flow details
 const handleSaveCellAssignment = (e: React.FormEvent) => {
 e.preventDefault();
 if (!editingProgram || !activeAssignCell) return;

 const { week, day } = activeAssignCell;
 const nextWeeks = { ...editingProgram.weeks };
 if (!nextWeeks[week]) nextWeeks[week] = {};

 let selectedTemplateName = '';
 if (assignType === 'Workout' || assignType === 'Challenge') {
 const match = workoutTemplates.find(t => t.id === assignTemplateId);
 selectedTemplateName = match ? match.name : 'Workout Session';
 }

 nextWeeks[week][day] = {
 type: assignType,
 workoutTemplateId: assignTemplateId || undefined,
 workoutTemplateName: selectedTemplateName || undefined,
 details: assignDetails,
 overloadSets: assignOverloadSets,
 overloadReps: assignOverloadReps,
 overloadWeightInc: assignOverloadWeightInc,
 overloadRestDec: assignOverloadRestDec,
 tempo: assignTempo,
 recoveryType: assignType === 'Rest' ? assignRecoveryType : undefined
 };

 setEditingProgram({ ...editingProgram, weeks: nextWeeks });
 setAssignModalOpen(false);
 setActiveAssignCell(null);
 showToast('Day details updated.', 'success');
 };

 const handleClearCell = (weekIdx: number, dayIdx: number, e: React.MouseEvent) => {
 e.stopPropagation();
 if (!editingProgram) return;

 const nextWeeks = { ...editingProgram.weeks };
 if (nextWeeks[weekIdx]?.[dayIdx]) {
 delete nextWeeks[weekIdx][dayIdx];
 setEditingProgram({ ...editingProgram, weeks: nextWeeks });
 showToast('Cleared day details.', 'success');
 }
 };

 // Duplicate Week
 const handleDuplicateWeek = (weekIdx: number) => {
 if (!editingProgram) return;

 const sourceWeek = editingProgram.weeks[weekIdx] || {};
 const nextWeeks = { ...editingProgram.weeks };
 const newWeekIdx = Object.keys(nextWeeks).length;

 nextWeeks[newWeekIdx] = JSON.parse(JSON.stringify(sourceWeek));

 setEditingProgram({
 ...editingProgram,
 durationWeeks: Math.max(editingProgram.durationWeeks, newWeekIdx + 1),
 weeks: nextWeeks
 });
 showToast(`Week ${weekIdx + 1} duplicated to Week ${newWeekIdx + 1}.`, 'success');
 };

 // Delete Week
 const handleDeleteWeek = (weekIdx: number) => {
 if (!editingProgram) return;

 const nextWeeks = { ...editingProgram.weeks };
 delete nextWeeks[weekIdx];

 // Shift subsequent weeks left
 const reorderedWeeks: typeof nextWeeks = {};
 let offset = 0;
 for (let w = 0; w < editingProgram.durationWeeks; w++) {
 if (w === weekIdx) {
 offset = 1;
 continue;
 }
 if (nextWeeks[w]) {
 reorderedWeeks[w - offset] = nextWeeks[w];
 }
 }

 setEditingProgram({
 ...editingProgram,
 durationWeeks: Math.max(1, editingProgram.durationWeeks - 1),
 weeks: reorderedWeeks
 });
 showToast(`Week ${weekIdx + 1} removed from timeline.`, 'success');
 };

 // Insert Empty Week
 const handleInsertWeek = () => {
 if (!editingProgram) return;
 setEditingProgram({
 ...editingProgram,
 durationWeeks: editingProgram.durationWeeks + 1
 });
 showToast('New week template appended.', 'success');
 };

 // Bulk Apply Overload rules to the program
 const handleBulkApplyOverload = (e: React.FormEvent) => {
 e.preventDefault();
 if (!editingProgram) return;

 const nextWeeks = { ...editingProgram.weeks };
 
 // Apply weekly increment progressions to existing workout templates
 Object.keys(nextWeeks).forEach(wKey => {
 const wIdx = parseInt(wKey);
 if (wIdx === 0) return; // Week 1 stays base

 Object.keys(nextWeeks[wIdx]).forEach(dKey => {
 const dIdx = parseInt(dKey);
 const cell = nextWeeks[wIdx][dIdx];
 if (cell.type === 'Workout') {
 // Linear accumulation rules
 cell.overloadSets = (cell.overloadSets || 3) + (bulkSetsProgression.includes('+') ? 1 : 0);
 cell.overloadWeightInc = (cell.overloadWeightInc || 0) + (parseFloat(bulkWeightProgression) || 0);
 cell.tempo = cell.tempo || '3-0-1-0';
 }
 });
 });

 setEditingProgram({ ...editingProgram, weeks: nextWeeks });
 setOverloadPanelOpen(false);
 showToast('Progressive overload rules applied across program weeks.', 'success');
 };

 // Calculate stats for preview sidebar
 const getSummaryMetrics = (prog: Program) => {
 let workouts = 0;
 let rests = 0;
 let cardios = 0;
 let mobilities = 0;

 Object.values(prog.weeks).forEach(week => {
 Object.values(week).forEach(day => {
 if (day.type === 'Workout') workouts++;
 else if (day.type === 'Rest') rests++;
 else if (day.type === 'Cardio') cardios++;
 else if (day.type === 'Mobility' || day.type === 'Stretching') mobilities++;
 });
 });

 const hours = Math.round((workouts * 1.2) + (cardios * 0.75) + (mobilities * 0.5));

 return { workouts, rests, cardios, mobilities, hours };
 };

 const currentSummary = editingProgram ? getSummaryMetrics(editingProgram) : { workouts: 0, rests: 0, cardios: 0, mobilities: 0, hours: 0 };

 const handleRestoreVersion = async (ver: any) => {
 if (!editingProgram) return;

 try {
 await workoutsApi.restoreVersion(editingProgram.id, ver.id);
 showToast(`Restored to version ${ver.version} successfully.`, 'success');
 
 const updatedRecord = await workoutsApi.get(editingProgram.id);
 const unpacked = unpackProgramRecord(updatedRecord);
 setEditingProgram(unpacked);
 setFormWeeks(unpacked.durationWeeks);
 
 setVersionModalOpen(false);
 loadPrograms();
 } catch (_) {
 showToast('Failed to restore version.', 'error');
 }
 };

 const handlePublishSettingsSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!editingProgram) return;

 setEditingProgram({
 ...editingProgram,
 visibility: formVisibility,
 status: 'Published'
 });
 setPublishModalOpen(false);
 showToast(`Program published to ${formVisibility}!`, 'success');
 };

 // Filter labels helper
 const isReceptionist = userRole === 'receptionist';
 const isTrainer = userRole === 'trainer';

 return (
 <div className="min-h-screen bg-white text-neutral-900 flex flex-col relative">
 {/* Toast Popup Notification */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all ${
 toast.type === 'success' ? 'bg-success-light text-success border-green-200' : 'bg-danger-light text-danger border-red-200'
 }`}>
 {toast.type === 'success' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
 {toast.message}
 </div>
 )}

 {/* Radial Background Glows */}

 {/* ========================================================================= */}
 {/* SECTION 1: DASHBOARD OR BUILDER HEADER ACTIONS */}
 {/* ========================================================================= */}
 <div className="px-8 pt-8 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-200/60 relative z-10">
 <div>
 <div className="flex items-center gap-2.5">
 <div className="w-9 h-9 rounded-xl bg-primary-light border border-red-200 flex items-center justify-center shadow-md">
 <BookOpen className="w-4 h-4 text-danger" />
 </div>
 <h1 className="text-xl font-black tracking-tight text-neutral-900 font-display">
 {currentView === 'builder' ? (isPreviewActive ? 'Program Preview Mode' : 'Training Program Builder') : 'Training Studio'}
 </h1>
 </div>
 <p className="text-xs text-neutral-600 mt-1">
 {currentView === 'builder' 
 ? (isPreviewActive ? 'Inspect the program experience from a member\'s point of view.' : 'Drag & drop templates, layout weeks, and progressive overload setups.') 
 : 'Compile workout templates into multi-week fitness programs.'}
 </p>
 </div>

 {/* Global Action Toolbar */}
 <div className="flex items-center gap-2.5 flex-wrap">
 {currentView === 'dashboard' && (
 <>
 <button
 type="button"
 onClick={() => showToast('Imports feature is only available for Enterprise tiers.', 'error')}
 className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition cursor-pointer"
 >
 <Download className="w-3.5 h-3.5" />
 <span>Import Program</span>
 </button>
 <button
 type="button"
 onClick={() => openBuilder(null)}
 disabled={isReceptionist}
 className="flex items-center gap-1.5 px-4 py-2 bg-danger hover:bg-red-600 text-white text-xs font-bold rounded-xl transition shadow-lg cursor-pointer disabled:opacity-50"
 >
 <Plus className="w-4 h-4" />
 <span>Create Program</span>
 </button>
 </>
 )}

 {currentView === 'builder' && (
 <>
 {/* Timeline vs Preview Toggles */}
 <div className="flex items-center bg-neutral-50 border border-neutral-200 rounded-xl p-1 shrink-0 gap-1 mr-3">
 <button
 type="button"
 onClick={() => setIsPreviewActive(false)}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition cursor-pointer ${!isPreviewActive ? 'bg-danger text-white shadow' : 'text-neutral-500 hover:text-neutral-700'}`}
 >
 Timeline Builder
 </button>
 <button
 type="button"
 onClick={() => setIsPreviewActive(true)}
 className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition cursor-pointer ${isPreviewActive ? 'bg-danger text-white shadow' : 'text-neutral-500 hover:text-neutral-600'}`}
 >
 Member Preview
 </button>
 </div>

 {!isPreviewActive && (
 <button
 type="button"
 onClick={() => setOverloadPanelOpen(true)}
 className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-800 text-xs font-bold rounded-xl cursor-pointer transition"
 >
 <Zap className="w-3.5 h-3.5 text-primary" />
 <span>Configure Overload</span>
 </button>
 )}

 <button
 type="button"
 onClick={() => setVersionModalOpen(true)}
 className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-800 text-xs font-bold rounded-xl cursor-pointer transition"
 >
 <History className="w-3.5 h-3.5" />
 <span>Version History</span>
 </button>

 <button
 type="button"
 onClick={() => setPublishModalOpen(true)}
 className="flex items-center gap-1.5 px-3.5 py-2 bg-success hover:bg-green-600 text-white text-xs font-bold rounded-xl cursor-pointer transition"
 >
 <Share2 className="w-3.5 h-3.5" />
 <span>Publish Settings</span>
 </button>

 <span className="w-px h-6 bg-neutral-100 mx-1" />

 <button
 type="button"
 onClick={() => { setEditingProgram(null); setCurrentView('dashboard'); }}
 className="px-3.5 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-600 hover:text-neutral-800 text-xs font-semibold rounded-xl cursor-pointer"
 >
 Cancel
 </button>

 <button
 type="button"
 onClick={handleSaveProgram}
 className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition shadow-lg cursor-pointer"
 >
 <Check className="w-4 h-4" />
 <span>Save Program</span>
 </button>
 </>
 )}
 </div>
 </div>

 {/* SUB-TABS (DASHBOARD MODE ONLY) */}
 {currentView === 'dashboard' && (
 <Tabs
 className="relative z-10"
 scrollable={false}
 tabs={[
 { id: 'dashboard', label: 'Workout Programs', icon: BookOpen },
 { id: 'analytics', label: 'Program Analytics', icon: Activity },
 ]}
 activeId={currentView}
 onChange={(id) => setCurrentView(id as any)}
 />
 )}

 {/* ========================================================================= */}
 {/* MAIN CONTAINER: VIEW 1 - PROGRAMS DASHBOARD & LISTING */}
 {/* ========================================================================= */}
 {currentView === 'dashboard' && (
 <div className="flex-1 p-8 relative z-10 overflow-y-auto space-y-6 flex flex-col">
 
 {/* 1.1 KPI Dashboard Header Cards */}
 <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
 {[
 { label: 'Total Programs', value: stats.total, sub: 'Created templates', color: 'text-blue-400' },
 { label: 'Published Programs', value: stats.published, sub: 'Active & assignable', color: 'text-success' },
 { label: 'Draft Programs', value: stats.draft, sub: 'Work in progress', color: 'text-neutral-600' },
 { label: 'Assigned Clients', value: stats.assigned, sub: 'Active members training', color: 'text-danger' },
 { label: 'Community Shared', value: stats.community, sub: 'Global hub visibility', color: 'text-purple-400' },
 { label: 'My Favorites', value: stats.favorites, sub: 'Quick access marked', color: 'text-amber-700', icon: Star }
 ].map((kpi, idx) => (
 <div key={idx} className="bg-neutral-50/40 border border-neutral-200/80 rounded-2xl p-4.5 flex flex-col justify-between hover:border-neutral-200/60 transition duration-205">
 <div>
 <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-extrabold">{kpi.label}</p>
 <p className="text-2xl font-black text-neutral-900 mt-1">{kpi.value}</p>
 </div>
 <div className="flex items-center justify-between mt-3 text-[10px] text-neutral-500 border-t border-neutral-200/30 pt-2 shrink-0">
 <span>{kpi.sub}</span>
 {kpi.icon && <kpi.icon className="w-3 h-3 text-amber-700 fill-warning" />}
 </div>
 </div>
 ))}
 </div>

 {/* 1.2 Main Search and Multi-Filters panel */}
 <div className="bg-neutral-50/30 border border-neutral-200/60 rounded-2xl p-5 space-y-4">
 <div className="flex flex-col lg:flex-row lg:items-center gap-3">
 {/* Search */}
 <div className="flex-1 relative">
 <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
 <Search size={15} />
 </div>
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search by program name, subtitle, tags..."
 className="w-full bg-neutral-50 border border-neutral-200 focus:border-red-200 rounded-xl pl-10 pr-4 py-3 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 />
 </div>

 {/* Reset Filters Quick Button */}
 <button
 type="button"
 onClick={() => { setSelectedGoal('all'); setSelectedDifficulty('all'); setSelectedDuration('all'); setSelectedStatus('all'); setSelectedVisibility('all'); setSearchQuery(''); }}
 className="flex items-center gap-1.5 px-4 py-3 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-600 hover:text-neutral-800 rounded-xl text-xs font-bold transition cursor-pointer"
 >
 <RefreshCw size={13} />
 <span>Reset Filters</span>
 </button>
 </div>

 {/* Dropdown Filters Grid */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-neutral-200/40">
 {/* Goal */}
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1">Fitness Goal</label>
 <select
 value={selectedGoal}
 onChange={e => setSelectedGoal(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-neutral-200 cursor-pointer"
 >
 <option value="all">All Goals</option>
 {FIT_GOALS.map(g => (
 <option key={g} value={g}>{g}</option>
 ))}
 </select>
 </div>

 {/* Difficulty */}
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1">Difficulty</label>
 <select
 value={selectedDifficulty}
 onChange={e => setSelectedDifficulty(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-600 focus:outline-none focus:border-neutral-200 cursor-pointer"
 >
 <option value="all">All Levels</option>
 <option value="Beginner">Beginner</option>
 <option value="Intermediate">Intermediate</option>
 <option value="Advanced">Advanced</option>
 <option value="Expert">Expert</option>
 </select>
 </div>

 {/* Duration */}
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1">Program Duration</label>
 <select
 value={selectedDuration}
 onChange={e => setSelectedDuration(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-neutral-200 cursor-pointer"
 >
 <option value="all">All Durations</option>
 <option value="short">1 - 4 Weeks (Short)</option>
 <option value="medium">5 - 8 Weeks (Medium)</option>
 <option value="long">9+ Weeks (Long)</option>
 </select>
 </div>

 {/* Status */}
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1">Status</label>
 <select
 value={selectedStatus}
 onChange={e => setSelectedStatus(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-neutral-200 cursor-pointer"
 >
 <option value="all">All Statuses</option>
 <option value="Draft">Draft</option>
 <option value="Published">Published</option>
 <option value="Archived">Archived</option>
 </select>
 </div>

 {/* Visibility */}
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1">Publish Scope</label>
 <select
 value={selectedVisibility}
 onChange={e => setSelectedVisibility(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-neutral-200 cursor-pointer"
 >
 <option value="all">All Scopes</option>
 <option value="Private">Private</option>
 <option value="Organization">Organization Only</option>
 <option value="Community">Community Library</option>
 <option value="Marketplace">Marketplace Shop</option>
 </select>
 </div>
 </div>
 </div>

 {/* 1.3 Empty State and Listing Grid */}
 {programsLoading ? (
 <div className="py-20 text-center text-xs text-neutral-500 flex flex-col items-center justify-center gap-3">
 <RefreshCw className="animate-spin text-danger" size={24} />
 <p className="font-semibold text-neutral-600 animate-pulse">Syncing workout programs...</p>
 </div>
 ) : filteredPrograms.length === 0 ? (
 <div className="border border-neutral-200 rounded-2xl p-16 text-center space-y-4 bg-white my-8">
 <AlertCircle className="w-12 h-12 text-neutral-400 mx-auto animate-bounce" />
 <div className="max-w-md mx-auto space-y-2">
 <h3 className="text-sm font-bold text-neutral-700">No Workout Programs Compiled</h3>
 <p className="text-xs text-neutral-500 leading-relaxed">
 Clear search filters or compile a new multi-week training cycle for your clients.
 </p>
 <button
 type="button"
 onClick={() => openBuilder(null)}
 className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-danger hover:bg-red-600 text-white text-xs font-bold rounded-xl transition shadow"
 >
 <Plus className="w-3.5 h-3.5" />
 <span>Build First Program</span>
 </button>
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {filteredPrograms.map((prog) => {
 const summary = getSummaryMetrics(prog);
 
 return (
 <div
 key={prog.id}
 onClick={() => openBuilder(prog)}
 className="group bg-white border border-neutral-200/80 hover:border-red-200 rounded-3xl overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between min-h-[360px]"
 >
 {/* Header Image Cover */}
 <div className="h-44 relative bg-neutral-50 overflow-hidden shrink-0">
 <img
 src={prog.coverImage}
 alt={prog.name}
 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-white via-white to-transparent" />
 
 {/* Tag badges */}
 <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 z-10">
 <span className={`text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded border ${
 prog.difficulty === 'Beginner' ? 'bg-success-light text-success border-green-200' :
 prog.difficulty === 'Intermediate' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
 prog.difficulty === 'Advanced' ? 'bg-primary-light text-primary border-primary/20' :
 'bg-danger-light text-danger border-red-200'
 }`}>
 {prog.difficulty}
 </span>
 <span className="bg-neutral-50/85 text-neutral-700 border border-neutral-200 text-[9px] font-bold px-2 py-0.5 rounded">
 {prog.durationWeeks} Wks
 </span>
 </div>

 {/* Favorite star */}
 <button
 type="button"
 onClick={(e) => handleToggleFavorite(prog.id, e)}
 className="absolute top-4 right-4 p-2 rounded-xl bg-neutral-50/80 hover:bg-neutral-50 border border-neutral-200/40 text-amber-700 transition-colors z-10"
 >
 <Star size={13} className={prog.isFavorite ? 'fill-warning' : 'text-neutral-500'} />
 </button>
 </div>

 {/* Middle details */}
 <div className="p-6 flex-1 flex flex-col justify-between">
 <div className="space-y-2">
 <div className="flex items-center justify-between gap-2">
 <span className="text-[10px] text-danger font-extrabold uppercase tracking-wider">{prog.goal}</span>
 <span className={`text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded border ${
 prog.status === 'Published' ? 'bg-success-light text-success border-green-200' : 'bg-neutral-100 text-neutral-600 border-neutral-200'
 }`}>
 {prog.status}
 </span>
 </div>
 <h3 className="text-base font-extrabold text-neutral-900 group-hover:text-neutral-900 transition-colors line-clamp-1">{prog.name}</h3>
 <p className="text-[11px] text-neutral-600 leading-normal line-clamp-2">{prog.subtitle}</p>
 </div>

 {/* Small Metrics breakdown */}
 <div className="grid grid-cols-3 gap-2 border-t border-b border-neutral-200/50 my-4 py-3 text-center text-neutral-600 shrink-0">
 <div>
 <span className="block text-[8px] uppercase tracking-wider font-bold">Sessions</span>
 <span className="text-xs font-black text-neutral-800 mt-0.5 inline-flex items-center gap-1">
 <Dumbbell size={10} className="text-danger" />
 {summary.workouts}
 </span>
 </div>
 <div>
 <span className="block text-[8px] uppercase tracking-wider font-bold">Rest Days</span>
 <span className="text-xs font-black text-neutral-800 mt-0.5 inline-flex items-center gap-1">
 <Smile size={10} className="text-success" />
 {summary.rests}
 </span>
 </div>
 <div>
 <span className="block text-[8px] uppercase tracking-wider font-bold">Total Est</span>
 <span className="text-xs font-black text-neutral-800 mt-0.5 inline-flex items-center gap-1">
 <Clock size={10} className="text-blue-400" />
 {summary.hours} hrs
 </span>
 </div>
 </div>

 {/* Creator info and Actions */}
 <div className="flex items-center justify-between mt-2 shrink-0">
 <span className="text-[10px] text-neutral-500 font-semibold">By {prog.trainerName}</span>
 
 <div className="flex items-center gap-1">
 <button
 type="button"
 onClick={(e) => handleDuplicate(prog.id, e)}
 className="p-1.5 text-neutral-500 hover:text-neutral-600 rounded border border-transparent hover:border-neutral-200"
 title="Duplicate program"
 >
 <Copy size={12} />
 </button>
 <button
 type="button"
 onClick={(e) => handleToggleArchive(prog.id, e)}
 className="p-1.5 text-neutral-500 hover:text-danger rounded border border-transparent hover:border-neutral-200"
 title={prog.status === 'Archived' ? 'Restore draft' : 'Archive program'}
 >
 <Trash size={12} />
 </button>
 <span className="text-xs font-bold text-danger group-hover:text-danger transition-colors flex items-center gap-1 ml-2">
 <span>Open Builder</span>
 <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
 </span>
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* 1.4 Recommendations Panel Widget */}
 <div className="bg-gradient-to-br from-neutral-50 to-danger-light border border-neutral-200/80 rounded-3xl p-6 mt-6 relative overflow-hidden">
 
 <div className="flex items-center gap-2.5 mb-4">
 <Sparkles size={16} className="text-danger animate-pulse" />
 <h4 className="text-xs font-extrabold uppercase tracking-widest text-neutral-800">Recommended Programs Ecosystem</h4>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="bg-neutral-50/45 border border-neutral-100 rounded-2xl p-4 flex gap-4 items-center">
 <div className="w-16 h-12 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-center font-bold text-[10px] text-danger uppercase tracking-widest font-mono">
 8wk HIIT
 </div>
 <div>
 <h5 className="text-xs font-bold text-neutral-800">12 Week Transformation Cycle</h5>
 <p className="text-[10px] text-neutral-500 mt-0.5">Recommended extension for clients completing"8 Week Fat Loss"</p>
 </div>
 </div>

 <div className="bg-neutral-50/45 border border-neutral-100 rounded-2xl p-4 flex gap-4 items-center">
 <div className="w-16 h-12 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-center font-bold text-[10px] text-blue-500 uppercase tracking-widest font-mono">
 4wk STR
 </div>
 <div>
 <h5 className="text-xs font-bold text-neutral-800">Intermediate Hypertrophy Split</h5>
 <p className="text-[10px] text-neutral-500 mt-0.5">Recommended progression pathway for"4 Week Beginner Strength"</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MAIN CONTAINER: VIEW 2 - PROGRAM TIMELINE BUILDER */}
 {/* ========================================================================= */}
 {currentView === 'builder' && editingProgram && (
 <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
 
 {/* ========================================== */}
 {/* BUILDER SIDE PANEL - LEFT (TEMPLATE SELECT) */}
 {/* ========================================== */}
 {!isPreviewActive && (
 <div className="w-full md:w-72 bg-neutral-50/40 border-r border-neutral-100 p-5 flex flex-col overflow-y-auto shrink-0 select-none">
 <div className="mb-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600">Workout Library</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Drag templates onto the timeline calendar days.</p>
 </div>

 {/* Template search */}
 <div className="relative mb-4 shrink-0">
 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
 <Search size={12} />
 </div>
 <input
 type="text"
 placeholder="Filter templates..."
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl pl-8 pr-3 py-2 text-[10px] text-neutral-700 outline-none"
 />
 </div>

 {/* Workouts List */}
 {templatesLoading ? (
 <div className="py-10 text-center text-[10px] text-neutral-500 animate-pulse">Syncing templates...</div>
 ) : (
 <div className="space-y-2 flex-1 overflow-y-auto pr-1">
 {workoutTemplates.map((wt) => (
 <div
 key={wt.id}
 draggable={true}
 onDragStart={() => handleDragStart(wt.id, wt.name)}
 className="p-3 bg-neutral-50/80 hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-200 rounded-xl cursor-grab active:cursor-grabbing hover:shadow-md transition-all group flex items-start justify-between gap-2"
 >
 <div className="min-w-0">
 <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase text-neutral-500">
 <Dumbbell size={8} className="text-danger" />
 <span>{wt.type || 'Strength'}</span>
 <span>•</span>
 <span className="text-neutral-400">{wt.difficulty || 'All'}</span>
 </div>
 <p className="text-xs font-bold text-neutral-800 mt-1 truncate">{wt.name}</p>
 </div>
 <MoreVertical size={12} className="text-neutral-400 mt-0.5 group-hover:text-neutral-500 shrink-0" />
 </div>
 ))}

 {/* Rest day template helper shortcut */}
 <div className="border border-dashed border-neutral-200 rounded-xl p-3 text-center text-neutral-500 text-[10px]">
 <p>Tip: Click any day cell directly to configure Rest, Cardio, and Custom exercises.</p>
 </div>
 </div>
 )}
 </div>
 )}

 {/* ========================================== */}
 {/* BUILDER CENTER PANEL - TIMELINE VIEW / PREVIEW */}
 {/* ========================================== */}
 <div className="flex-1 bg-white p-6 overflow-y-auto flex flex-col justify-between gap-6">
 
 {/* 2.1 General Settings Summary info edit bar */}
 {!isPreviewActive && (
 <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 space-y-4 shrink-0">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="md:col-span-2">
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1">Program Name</label>
 <input
 type="text"
 value={formName}
 onChange={e => setFormName(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 focus:border-red-200 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1">Sub-heading</label>
 <input
 type="text"
 value={formSubtitle}
 onChange={e => setFormSubtitle(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 focus:border-red-200 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1">Primary Fitness Goal</label>
 <select
 value={formGoal}
 onChange={e => setFormGoal(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-xs text-neutral-700 outline-none cursor-pointer"
 >
 {FIT_GOALS.map(g => (
 <option key={g} value={g}>{g}</option>
 ))}
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1">Difficulty Target</label>
 <select
 value={formDifficulty}
 onChange={e => setFormDifficulty(e.target.value as any)}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-xs text-neutral-700 outline-none cursor-pointer"
 >
 <option value="Beginner">Beginner Level</option>
 <option value="Intermediate">Intermediate</option>
 <option value="Advanced">Advanced Level</option>
 <option value="Expert">Expert Athlete</option>
 </select>
 </div>
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1">Duration (Weeks)</label>
 <input
 type="number"
 value={formWeeks}
 min={1}
 max={24}
 onChange={e => {
 const val = parseInt(e.target.value) || 1;
 setFormWeeks(val);
 }}
 className="w-full bg-neutral-50 border border-neutral-100 focus:border-red-200 rounded-xl px-3 py-2 text-xs text-neutral-900 outline-none"
 />
 </div>
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1">Initial Visibility</label>
 <select
 value={formVisibility}
 onChange={e => setFormVisibility(e.target.value as any)}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-xs text-neutral-700 outline-none cursor-pointer"
 >
 <option value="Private">Private Draft</option>
 <option value="Organization">Organization Only</option>
 <option value="Community">Community Library</option>
 <option value="Marketplace">Marketplace Shop</option>
 </select>
 </div>
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1">Description Brief</label>
 <input
 type="text"
 value={formDesc}
 onChange={e => setFormDesc(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 focus:border-red-200 rounded-xl px-3 py-2 text-xs text-neutral-900 outline-none"
 />
 </div>
 </div>
 </div>
 )}

 {/* 2.2 Visual Timeline Planner */}
 {!isPreviewActive ? (
 <div className="space-y-6 flex-1">
 {/* Loop Weeks */}
 {[...Array(formWeeks)].map((_, wIdx) => {
 const weekData = editingProgram.weeks[wIdx] || {};
 
 return (
 <div key={wIdx} className="bg-neutral-50/20 border border-neutral-200/80 rounded-3xl p-5 space-y-4">
 {/* Week Title & Actions */}
 <div className="flex items-center justify-between border-b border-neutral-200/50 pb-3">
 <div className="flex items-center gap-2">
 <Calendar className="w-4 h-4 text-danger" />
 <h4 className="text-xs font-extrabold text-neutral-800 uppercase tracking-widest">Week {wIdx + 1} Planning</h4>
 </div>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => handleDuplicateWeek(wIdx)}
 className="flex items-center gap-1 px-2.5 py-1 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-600 hover:text-neutral-800 text-[10px] font-bold rounded-lg transition"
 >
 <Copy size={10} />
 <span>Duplicate Week</span>
 </button>
 <button
 type="button"
 onClick={() => handleDeleteWeek(wIdx)}
 className="flex items-center gap-1 px-2.5 py-1 bg-neutral-50 border border-neutral-200 hover:border-red-200 text-neutral-500 hover:text-danger text-[10px] font-bold rounded-lg transition"
 >
 <Trash size={10} />
 <span>Remove Week</span>
 </button>
 </div>
 </div>

 {/* Daily schedule columns grid */}
 <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
 {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((dayName, dIdx) => {
 const cell = weekData[dIdx];
 const hasContent = !!cell;
 
 return (
 <div
 key={dIdx}
 onDragOver={(e) => e.preventDefault()}
 onDrop={() => handleCellDrop(wIdx, dIdx)}
 onClick={() => handleCellClick(wIdx, dIdx)}
 className={`group min-h-[120px] p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between text-left ${
 hasContent
 ? (cell.type === 'Rest' 
 ? 'bg-neutral-50/40 border-neutral-200 hover:border-neutral-200' 
 : 'bg-white border-red-200 hover:border-red-200')
 : 'bg-neutral-50/20 border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50/50 border-dashed'
 }`}
 >
 {/* Header Day */}
 <div className="flex items-center justify-between text-[9px] font-extrabold uppercase text-neutral-500 select-none">
 <span>{dayName.substring(0, 3)}</span>
 {hasContent && (
 <button
 type="button"
 onClick={(e) => handleClearCell(wIdx, dIdx, e)}
 className="opacity-0 group-hover:opacity-150 p-0.5 text-neutral-500 hover:text-danger transition"
 >
 <X size={10} />
 </button>
 )}
 </div>

 {/* Card Content display */}
 <div className="my-2 flex-1 flex flex-col justify-center">
 {hasContent ? (
 <div>
 <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
 cell.type === 'Rest' ? 'bg-success text-success border-green-200' :
 cell.type === 'Cardio' ? 'bg-blue-955 text-blue-400 border-blue-900/30' :
 'bg-danger text-danger border-red-200'
 }`}>
 {cell.type}
 </span>
 
 <p className="text-[11px] font-extrabold text-neutral-800 mt-2 line-clamp-2 leading-tight">
 {cell.type === 'Rest' ? (cell.recoveryType || 'Complete Rest') : (cell.workoutTemplateName || cell.details || 'Active Workout')}
 </p>
 
 {cell.overloadSets ? (
 <p className="text-[9px] font-mono text-neutral-500 mt-1 font-semibold">
 {cell.overloadSets}x{cell.overloadReps} {(cell.overloadWeightInc ?? 0) > 0 ? `(+${cell.overloadWeightInc}kg)` : ''}
 </p>
 ) : null}
 </div>
 ) : (
 <div className="text-center text-[10px] text-neutral-400 select-none group-hover:text-neutral-600 py-2">
 <Plus size={14} className="mx-auto text-neutral-400 group-hover:text-neutral-500 mb-1" />
 <span>Empty day</span>
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
 })}

 {/* Timeline Bottom Add Week Row */}
 <button
 type="button"
 onClick={handleInsertWeek}
 className="w-full py-4 border border-dashed border-neutral-200 hover:border-red-200 hover:bg-danger-light rounded-3xl transition-all flex items-center justify-center gap-1.5 text-xs text-neutral-600 hover:text-danger font-bold cursor-pointer"
 >
 <Plus size={16} />
 <span>Insert Empty Training Week</span>
 </button>
 </div>
 ) : (
 /* ========================================================================= */
 /* MEMBER PREVIEW EXPERIENCE VIEWS */
 /* ========================================================================= */
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 flex-1 flex flex-col gap-6">
 
 {/* 2.3.1 Preview Sub-Navigation */}
 <div className="flex items-center justify-between border-b border-neutral-200/60 pb-3 shrink-0">
 <div className="flex items-center gap-4">
 <span className="text-xs font-bold text-neutral-600">Switch Layout views:</span>
 <div className="flex bg-neutral-50 border border-neutral-100 rounded-lg p-0.5">
 {([
 { id: 'week', label: 'Week View' },
 { id: 'calendar', label: 'Calendar Grid' },
 { id: 'timeline', label: 'Full Timeline' }
 ] as const).map(tab => (
 <button
 key={tab.id}
 type="button"
 onClick={() => setPreviewTab(tab.id)}
 className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${previewTab === tab.id ? 'bg-danger text-white' : 'text-neutral-500 hover:text-neutral-700'}`}
 >
 {tab.label}
 </button>
 ))}
 </div>
 </div>

 {previewTab === 'week' && (
 <div className="flex items-center gap-2">
 <span className="text-[10px] text-neutral-500">Week selector:</span>
 <select
 value={selectedPreviewWeek}
 onChange={(e) => setSelectedPreviewWeek(parseInt(e.target.value))}
 className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-[10px] text-neutral-700 cursor-pointer focus:outline-none"
 >
 {[...Array(formWeeks)].map((_, i) => (
 <option key={i} value={i}>Week {i + 1}</option>
 ))}
 </select>
 </div>
 )}
 </div>

 {/* 2.3.2 Preview View Content */}
 <div className="flex-1 overflow-y-auto">
 {previewTab === 'week' && (
 <div className="space-y-4">
 <div className="p-4 bg-neutral-50/40 rounded-2xl border border-neutral-100">
 <h4 className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider">Coach Daily Guidance</h4>
 <p className="text-[11px] text-neutral-500 leading-relaxed mt-2">
 Welcome to Week {selectedPreviewWeek + 1}! Review structural targets below. Complete all workouts. Click boxes on completion.
 </p>
 </div>

 <div className="space-y-2">
 {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((dayName, dIdx) => {
 const cell = editingProgram.weeks[selectedPreviewWeek]?.[dIdx];
 const hasContent = !!cell;
 
 return (
 <div key={dIdx} className="p-4 bg-neutral-50/50 border border-neutral-200 hover:border-neutral-200 rounded-2xl flex items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="w-16 text-center border-r border-neutral-200 pr-3">
 <span className="block text-[8px] uppercase tracking-wide font-extrabold text-neutral-500">{dayName.substring(0, 3)}</span>
 <span className="text-xs font-mono font-bold text-neutral-700 mt-0.5 block">Day {dIdx + 1}</span>
 </div>

 <div>
 {hasContent ? (
 <>
 <div className="flex items-center gap-2">
 <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
 cell.type === 'Rest' ? 'bg-success text-success border-green-200' : 'bg-danger text-danger border-red-200'
 }`}>
 {cell.type}
 </span>
 {cell.tempo && <span className="text-[9px] font-mono text-neutral-500 font-bold">Tempo: {cell.tempo}</span>}
 </div>
 <p className="text-xs font-bold text-neutral-800 mt-1">
 {cell.type === 'Rest' ? (cell.recoveryType || 'Complete Rest') : (cell.workoutTemplateName || cell.details || 'Active Workout')}
 </p>
 </>
 ) : (
 <span className="text-xs text-neutral-400 font-medium">Rest & Recovery (No scheduled targets)</span>
 )}
 </div>
 </div>

 <div className="flex items-center gap-3">
 {hasContent && cell.overloadSets && (
 <span className="text-xs font-mono font-bold text-danger bg-danger-light border border-red-200 px-2 py-0.5 rounded">
 {cell.overloadSets} sets × {cell.overloadReps} reps
 </span>
 )}
 <div className="w-5 h-5 rounded-md border-2 border-neutral-200 hover:border-red-200 flex items-center justify-center cursor-pointer text-neutral-900">
 {/* simulate check */}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {previewTab === 'calendar' && (
 <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-neutral-50/20 text-xs">
 {/* Grid Header */}
 <div className="grid grid-cols-7 bg-neutral-50/60 border-b border-neutral-200 text-center font-extrabold uppercase text-[9px] text-neutral-500 p-2 tracking-wider shrink-0">
 <div>Mon</div>
 <div>Tue</div>
 <div>Wed</div>
 <div>Thu</div>
 <div>Fri</div>
 <div>Sat</div>
 <div>Sun</div>
 </div>

 {/* Grid Body */}
 <div className="divide-y divide-neutral-200">
 {[...Array(formWeeks)].map((_, wIdx) => (
 <div key={wIdx} className="grid grid-cols-7 divide-x divide-neutral-200 min-h-[80px]">
 {[...Array(7)].map((_, dIdx) => {
 const cell = editingProgram.weeks[wIdx]?.[dIdx];
 
 return (
 <div key={dIdx} className="p-2 flex flex-col justify-between gap-1 overflow-hidden">
 <span className="text-[9px] font-bold text-neutral-400 block">W{wIdx + 1}D{dIdx + 1}</span>
 
 {cell ? (
 <div className="truncate">
 <span className={`text-[7px] font-bold uppercase ${cell.type === 'Rest' ? 'text-success' : 'text-danger'}`}>{cell.type}</span>
 <p className="text-[10px] font-bold text-neutral-700 truncate mt-0.5">{cell.type === 'Rest' ? cell.recoveryType : (cell.workoutTemplateName || cell.details)}</p>
 </div>
 ) : (
 <span className="text-[9px] text-neutral-400 italic">Rest</span>
 )}
 </div>
 );
 })}
 </div>
 ))}
 </div>
 </div>
 )}

 {previewTab === 'timeline' && (
 <div className="relative border-l border-neutral-200 ml-4 pl-6 space-y-8 py-2">
 {[...Array(formWeeks)].map((_, wIdx) => (
 <div key={wIdx} className="relative">
 {/* Dot marker */}
 <div className="absolute left-[-29px] top-1.5 w-2.5 h-2.5 rounded-full bg-danger border border-neutral-100" />
 <h4 className="text-xs font-extrabold text-neutral-800 uppercase tracking-widest mb-3">Week {wIdx + 1} Phase</h4>
 
 <div className="space-y-2.5">
 {[...Array(7)].map((_, dIdx) => {
 const cell = editingProgram.weeks[wIdx]?.[dIdx];
 if (!cell) return null;
 
 return (
 <div key={dIdx} className="p-3.5 bg-neutral-50/60 border border-neutral-200/60 hover:border-neutral-200 rounded-xl flex items-center justify-between text-xs max-w-xl">
 <div>
 <span className="text-[9px] font-bold text-neutral-500 mr-2">Day {dIdx + 1}</span>
 <span className="font-bold text-neutral-800">{cell.type === 'Rest' ? cell.recoveryType : (cell.workoutTemplateName || cell.details)}</span>
 </div>
 {cell.overloadSets && (
 <span className="text-[10px] font-mono text-danger">{cell.overloadSets}x{cell.overloadReps}</span>
 )}
 </div>
 );
 })}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 )}
 </div>

 {/* ========================================== */}
 {/* BUILDER SIDE PANEL - RIGHT (PROGRAM SUMMARY) */}
 {/* ========================================== */}
 <div className="w-full md:w-80 bg-neutral-50/40 border-l border-neutral-100 p-5 flex flex-col justify-between overflow-y-auto shrink-0 select-none">
 <div className="space-y-6">
 <div>
 <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600 border-b border-neutral-100 pb-2">Program Metrics</h3>
 
 {/* Visual Muscle distribution */}
 <div className="mt-4 bg-neutral-50/30 p-3.5 rounded-2xl border border-neutral-100 space-y-3.5">
 <div>
 <div className="flex justify-between text-[10px] text-neutral-600 mb-1">
 <span>Chest & Shoulders (Push)</span>
 <span className="font-bold text-danger">35%</span>
 </div>
 <div className="h-1.5 bg-neutral-50 rounded-full overflow-hidden">
 <div className="h-full bg-danger rounded-full" style={{ width: '35%' }} />
 </div>
 </div>

 <div>
 <div className="flex justify-between text-[10px] text-neutral-600 mb-1">
 <span>Back & Arms (Pull)</span>
 <span className="font-bold text-blue-400">30%</span>
 </div>
 <div className="h-1.5 bg-neutral-50 rounded-full overflow-hidden">
 <div className="h-full bg-blue-500 rounded-full" style={{ width: '30%' }} />
 </div>
 </div>

 <div>
 <div className="flex justify-between text-[10px] text-neutral-600 mb-1">
 <span>Quadriceps & Glutes (Legs)</span>
 <span className="font-bold text-success">25%</span>
 </div>
 <div className="h-1.5 bg-neutral-50 rounded-full overflow-hidden">
 <div className="h-full bg-success rounded-full" style={{ width: '25%' }} />
 </div>
 </div>

 <div>
 <div className="flex justify-between text-[10px] text-neutral-600 mb-1">
 <span>Core & Cardio Conditioning</span>
 <span className="font-bold text-amber-700">10%</span>
 </div>
 <div className="h-1.5 bg-neutral-50 rounded-full overflow-hidden">
 <div className="h-full bg-warning rounded-full" style={{ width: '10%' }} />
 </div>
 </div>
 </div>
 </div>

 {/* Equipment block */}
 <div>
 <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">Required Equipment</h4>
 <div className="flex flex-wrap gap-1.5">
 {['Barbell', 'Dumbbell', 'Machines', 'Cables', 'Kettlebell', 'Bands'].map(eq => {
 const isSelected = formEquipment.includes(eq);
 return (
 <button
 key={eq}
 type="button"
 onClick={() => {
 if (isSelected) setFormEquipment(formEquipment.filter(x => x !== eq));
 else setFormEquipment([...formEquipment, eq]);
 }}
 className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border transition ${
 isSelected ? 'bg-danger-light border-red-200 text-danger font-extrabold' : 'bg-neutral-50 border-neutral-200 text-neutral-500 hover:text-neutral-700'
 }`}
 >
 {eq}
 </button>
 );
 })}
 </div>
 </div>

 {/* Stats values list */}
 <div className="space-y-2 text-xs">
 <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 border-b border-neutral-100 pb-2">Program Statistics</h4>
 
 <div className="flex justify-between py-1 border-b border-neutral-100/50">
 <span className="text-neutral-500">Weekly Frequency:</span>
 <span className="font-mono text-neutral-800 font-bold">{(currentSummary.workouts / formWeeks).toFixed(1)} sessions/wk</span>
 </div>
 <div className="flex justify-between py-1 border-b border-neutral-100/50">
 <span className="text-neutral-500">Push/Pull Ratio:</span>
 <span className="font-mono text-neutral-800 font-bold">1.2 (Balanced)</span>
 </div>
 <div className="flex justify-between py-1 border-b border-neutral-100/50">
 <span className="text-neutral-500">Recovery Days:</span>
 <span className="font-mono text-neutral-800 font-bold">{currentSummary.rests} days</span>
 </div>
 <div className="flex justify-between py-1">
 <span className="text-neutral-500">Avg Session Duration:</span>
 <span className="font-mono text-neutral-800 font-bold">52 minutes</span>
 </div>
 </div>
 </div>

 {/* Program cover select helper */}
 <div className="mt-6 border-t border-neutral-100 pt-4 space-y-2">
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase tracking-wider">Cover Image URL</label>
 <input
 type="text"
 value={formCover}
 onChange={e => setFormCover(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 focus:border-red-200 rounded-xl px-2.5 py-1.5 text-[9px] text-neutral-700 outline-none font-mono"
 />
 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MAIN CONTAINER: VIEW 3 - PROGRAM ANALYTICS */}
 {/* ========================================================================= */}
 {currentView === 'analytics' && (
 <div className="flex-1 p-8 relative z-10 overflow-y-auto space-y-6 flex flex-col">
 <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
 <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
 <Activity className="w-4 h-4 text-danger animate-pulse" />
 <span>Training Studio Programs Analytics</span>
 </h3>
 <span className="text-[10px] font-mono text-neutral-500 font-bold">HQ Unified Telemetry</span>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Most Assigned Programs */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
 <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
 <Users size={14} className="text-danger" />
 <span>Most Assigned Programs</span>
 </h4>
 
 <div className="space-y-3 text-xs">
 {[
 { name: '4 Week Beginner Strength Starter', count: 182, rate: '92% completion' },
 { name: '8 Week Fat Loss & HIIT Engine', count: 144, rate: '85% completion' },
 { name: '12 Week Hypertrophy Masterclass', count: 68, rate: '74% completion' }
 ].map((item, idx) => (
 <div key={idx} className="flex justify-between items-center p-3 bg-neutral-50/40 border border-neutral-100 rounded-xl">
 <span className="font-bold text-neutral-800">{item.name}</span>
 <span className="font-mono text-danger bg-danger-light px-2 py-0.5 border border-red-200 rounded font-bold">{item.count} clients</span>
 </div>
 ))}
 </div>
 </div>

 {/* Workout completion rates */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
 <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
 <Target size={14} className="text-blue-500 animate-pulse" />
 <span>Completion Rates & Engagement</span>
 </h4>
 
 <div className="space-y-3.5 text-xs">
 <div>
 <div className="flex justify-between mb-1">
 <span className="text-neutral-700 font-semibold">4 Week Beginner Strength Starter</span>
 <span className="font-mono text-neutral-800 font-bold">92% Completion Rate</span>
 </div>
 <div className="h-2 bg-neutral-50 rounded-full overflow-hidden">
 <div className="h-full bg-success rounded-full" style={{ width: '92%' }} />
 </div>
 </div>

 <div>
 <div className="flex justify-between mb-1">
 <span className="text-neutral-700 font-semibold">8 Week Fat Loss & HIIT Engine</span>
 <span className="font-mono text-neutral-800 font-bold">85% Completion Rate</span>
 </div>
 <div className="h-2 bg-neutral-50 rounded-full overflow-hidden">
 <div className="h-full bg-blue-500 rounded-full" style={{ width: '85%' }} />
 </div>
 </div>

 <div>
 <div className="flex justify-between mb-1">
 <span className="text-neutral-700 font-semibold">12 Week Hypertrophy Masterclass</span>
 <span className="font-mono text-neutral-800 font-bold">74% Completion Rate</span>
 </div>
 <div className="h-2 bg-neutral-50 rounded-full overflow-hidden">
 <div className="h-full bg-primary rounded-full" style={{ width: '74%' }} />
 </div>
 </div>
 </div>
 </div>

 {/* Popular fitness goals taxonomy */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
 <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Most Popular Program Goals</h4>
 <div className="space-y-2">
 {[
 { name: 'Fat Loss', pct: 40, color: 'bg-danger' },
 { name: 'Strength', pct: 30, color: 'bg-blue-500' },
 { name: 'Hypertrophy', pct: 20, color: 'bg-success' },
 { name: 'Endurance', pct: 10, color: 'bg-warning' }
 ].map((item, idx) => (
 <div key={idx} className="flex items-center gap-3 text-xs">
 <span className="w-20 font-bold text-neutral-700 truncate">{item.name}</span>
 <div className="flex-1 h-3 bg-neutral-50 rounded-full overflow-hidden">
 <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
 </div>
 <span className="w-8 font-mono text-neutral-500 font-bold text-right">{item.pct}%</span>
 </div>
 ))}
 </div>
 </div>

 {/* Marketplace & Sharing Analytics */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
 <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1">
 <ShoppingCart size={13} className="text-amber-700" />
 <span>Marketplace & Shared Catalog Performance</span>
 </h4>

 <div className="grid grid-cols-2 gap-4 text-center text-xs">
 <div className="bg-neutral-50 p-4 border border-neutral-100 rounded-2xl">
 <span className="block text-[9px] text-neutral-500 uppercase tracking-wider font-extrabold">Active Shared Copies</span>
 <span className="text-xl font-black text-neutral-800 mt-1 block">42 Programs</span>
 <span className="text-[10px] text-neutral-500 block mt-1">Across 12 partner gyms</span>
 </div>

 <div className="bg-neutral-50 p-4 border border-neutral-100 rounded-2xl">
 <span className="block text-[9px] text-neutral-500 uppercase tracking-wider font-extrabold">Marketplace Earned</span>
 <span className="text-xl font-black text-neutral-800 mt-1 block">$1,450.00</span>
 <span className="text-[10px] text-success block mt-1">From 5 premium packages</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MODAL 1: WEEKLY PLANNER CELL / WORKOUT TIMELINE ASSIGNMENT FLOW */}
 {/* ========================================================================= */}
 {assignModalOpen && activeAssignCell && (
 <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
 <form
 onSubmit={handleSaveCellAssignment}
 className="w-full max-w-lg bg-white border border-neutral-200 p-6 rounded-3xl space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin text-xs"
 >
 <div className="flex justify-between items-center border-b border-neutral-100/80 pb-3">
 <div>
 <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
 <Plus className="w-4 h-4 text-danger" />
 <span>Configure Week {activeAssignCell.week + 1}, Day {activeAssignCell.day + 1}</span>
 </h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Assign templates, rest days, or configure progressive overload.</p>
 </div>
 <button
 type="button"
 onClick={() => setAssignModalOpen(false)}
 className="text-neutral-500 hover:text-neutral-700 cursor-pointer"
 >
 <X size={18} />
 </button>
 </div>

 <div className="space-y-4">
 {/* Type Switch */}
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase tracking-wider mb-2">Assignment Type</label>
 <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
 {[
 { id: 'Workout', label: 'Workout' },
 { id: 'Cardio', label: 'Cardio Focus' },
 { id: 'Stretching', label: 'Stretching' },
 { id: 'Mobility', label: 'Mobility' },
 { id: 'Rest', label: 'Rest Day' },
 { id: 'Assessment', label: 'Assessment' },
 { id: 'Challenge', label: 'Challenge' }
 ].map((t) => (
 <button
 key={t.id}
 type="button"
 onClick={() => setAssignType(t.id as any)}
 className={`py-2 px-3 border rounded-xl text-center font-bold text-[10px] transition cursor-pointer ${
 assignType === t.id
 ? 'bg-danger-light border-red-200 text-danger font-extrabold shadow'
 : 'bg-neutral-50 border-neutral-100 text-neutral-600 hover:text-neutral-700'
 }`}
 >
 {t.label}
 </button>
 ))}
 </div>
 </div>

 {/* Conditional parameters based on type */}
 {(assignType === 'Workout' || assignType === 'Challenge') && (
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1.5">Select Workout Template</label>
 <select
 value={assignTemplateId}
 onChange={(e) => setAssignTemplateId(e.target.value)}
 required
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2.5 text-neutral-800 outline-none cursor-pointer"
 >
 <option value="" disabled>Choose template...</option>
 {workoutTemplates.map(wt => (
 <option key={wt.id} value={wt.id}>{wt.name} ({wt.type || 'Workout'})</option>
 ))}
 </select>
 </div>
 )}

 {assignType === 'Rest' && (
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1.5">Rest Subtype</label>
 <select
 value={assignRecoveryType}
 onChange={(e) => setAssignRecoveryType(e.target.value as any)}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2.5 text-neutral-800 outline-none cursor-pointer"
 >
 <option value="Complete Rest">Complete Rest (Zero activity)</option>
 <option value="Active Recovery">Active Recovery (Light walking/strolling)</option>
 <option value="Stretching">Stretching Session (Flexibility focus)</option>
 <option value="Walking">Walking Cycle (LISS cardio)</option>
 <option value="Yoga">Yoga Flow (Mobility & mindfulness)</option>
 <option value="Mobility">Mobility Routine (Joint preservation)</option>
 </select>
 </div>
 )}

 {/* Dynamic progressive overload targets (for Workout types) */}
 {(assignType === 'Workout' || assignType === 'Cardio' || assignType === 'Challenge') && (
 <div className="bg-white border border-neutral-100 rounded-2xl p-4.5 space-y-4">
 <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-neutral-600 tracking-wider">
 <Zap size={12} className="text-primary" />
 <span>Progressive Overload Rules</span>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 <div>
 <label className="block text-[8px] text-neutral-500 font-bold uppercase mb-1">Target Sets</label>
 <input
 type="number"
 min={1}
 max={10}
 value={assignOverloadSets}
 onChange={(e) => setAssignOverloadSets(parseInt(e.target.value) || 3)}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-2 font-mono text-neutral-800 outline-none"
 />
 </div>

 <div>
 <label className="block text-[8px] text-neutral-500 font-bold uppercase mb-1">Target Reps</label>
 <input
 type="text"
 value={assignOverloadReps}
 onChange={(e) => setAssignOverloadReps(e.target.value)}
 placeholder="e.g. 10 or 8-12"
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-2 font-mono text-neutral-800 outline-none"
 />
 </div>

 <div>
 <label className="block text-[8px] text-neutral-500 font-bold uppercase mb-1">Wt. Progression (+kg)</label>
 <input
 type="number"
 step={0.5}
 value={assignOverloadWeightInc}
 onChange={(e) => setAssignOverloadWeightInc(parseFloat(e.target.value) || 0)}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-2 font-mono text-neutral-800 outline-none"
 />
 </div>

 <div>
 <label className="block text-[8px] text-neutral-500 font-bold uppercase mb-1">Rest Reduction (-s)</label>
 <input
 type="number"
 value={assignOverloadRestDec}
 onChange={(e) => setAssignOverloadRestDec(parseInt(e.target.value) || 0)}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-2 font-mono text-neutral-800 outline-none"
 />
 </div>
 </div>

 <div>
 <label className="block text-[8px] text-neutral-500 font-bold uppercase mb-1.5">Tempo Progression</label>
 <input
 type="text"
 value={assignTempo}
 onChange={(e) => setAssignTempo(e.target.value)}
 placeholder="e.g. 3-0-1-0 (Eccentric-Pause-Concentric-Pause)"
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-2.5 font-mono text-neutral-800 outline-none"
 />
 </div>
 </div>
 )}

 {/* Instructions / Notes details */}
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase tracking-wider mb-1.5">Custom Notes / Workout Details</label>
 <textarea
 value={assignDetails}
 onChange={(e) => setAssignDetails(e.target.value)}
 placeholder="Enter specific rules, recovery goals, scaling advice, or tempo rules..."
 rows={3}
 className="w-full bg-neutral-50 border border-neutral-100 focus:border-red-200 rounded-xl p-3 text-neutral-900 placeholder-neutral-400 outline-none resize-none"
 />
 </div>
 </div>

 {/* Modal actions */}
 <div className="flex gap-3 pt-3 border-t border-neutral-100">
 <button
 type="button"
 onClick={() => setAssignModalOpen(false)}
 className="flex-1 py-3 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-600 hover:text-neutral-800 font-bold rounded-xl transition cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition cursor-pointer"
 >
 Save Details
 </button>
 </div>
 </form>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MODAL 2: PROGRESSIVE OVERLOAD BULK GLOBAL SETUP RULES */}
 {/* ========================================================================= */}
 {overloadPanelOpen && (
 <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
 <form
 onSubmit={handleBulkApplyOverload}
 className="w-full max-w-md bg-white border border-neutral-200 p-6 rounded-3xl space-y-4 shadow-2xl relative text-xs"
 >
 <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
 <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
 <Zap className="w-4 h-4 text-primary" />
 <span>Bulk Overload Progression Rules</span>
 </h3>
 <button
 type="button"
 onClick={() => setOverloadPanelOpen(false)}
 className="text-neutral-500 hover:text-neutral-700 cursor-pointer"
 >
 <X size={18} />
 </button>
 </div>

 <p className="text-[11px] text-neutral-600 leading-normal">
 Apply structural progression increments incrementally from Week 1 to subsequent weeks. For example, increase barbell weights by +2.5kg each week automatically.
 </p>

 <div className="space-y-3">
 <div>
 <label className="block text-[8px] text-neutral-500 font-bold uppercase mb-1">Sets Progression</label>
 <select
 value={bulkSetsProgression}
 onChange={(e) => setBulkSetsProgression(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-2 text-neutral-700 outline-none cursor-pointer"
 >
 <option value="+0">Constant sets (Keep base sets)</option>
 <option value="+1">Increase 1 set per week (Volume spike)</option>
 </select>
 </div>

 <div>
 <label className="block text-[8px] text-neutral-500 font-bold uppercase mb-1">Reps Progression</label>
 <select
 value={bulkRepsProgression}
 onChange={(e) => setBulkRepsProgression(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-2 text-neutral-700 outline-none cursor-pointer"
 >
 <option value="+0">Constant target reps</option>
 <option value="+1">Increase 1 rep per week (Accumulation)</option>
 </select>
 </div>

 <div>
 <label className="block text-[8px] text-neutral-500 font-bold uppercase mb-1">Weight Multiplier Progression</label>
 <select
 value={bulkWeightProgression}
 onChange={(e) => setBulkWeightProgression(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-2 text-neutral-700 outline-none cursor-pointer"
 >
 <option value="0">Constant weights</option>
 <option value="2.5">+2.5 kg linear weekly load</option>
 <option value="5">+5.0 kg weekly (Heavy Compound focus)</option>
 </select>
 </div>

 <div>
 <label className="block text-[8px] text-neutral-500 font-bold uppercase mb-1">Rest Interval Progression</label>
 <select
 value={bulkRestProgression}
 onChange={(e) => setBulkRestProgression(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl p-2 text-neutral-700 outline-none cursor-pointer"
 >
 <option value="0">Constant rest periods</option>
 <option value="-10">Reduce rest by 10s weekly (Density progression)</option>
 </select>
 </div>
 </div>

 <div className="flex gap-3 pt-3 border-t border-neutral-100">
 <button
 type="button"
 onClick={() => setOverloadPanelOpen(false)}
 className="flex-1 py-3.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-600 hover:text-neutral-800 font-bold rounded-xl cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="flex-1 py-3.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg cursor-pointer"
 >
 Apply Progression
 </button>
 </div>
 </form>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MODAL 3: PROGRAM VERSION CONTROL HISTORY */}
 {/* ========================================================================= */}
 {versionModalOpen && editingProgram && (
 <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
 <div className="w-full max-w-md bg-white border border-neutral-200 p-6 rounded-3xl space-y-4 shadow-2xl relative text-xs">
 <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
 <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
 <History className="w-4 h-4 text-danger" />
 <span>Program Version History</span>
 </h3>
 <button
 type="button"
 onClick={() => setVersionModalOpen(false)}
 className="text-neutral-500 hover:text-neutral-600 cursor-pointer"
 >
 <X size={18} />
 </button>
 </div>

 <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
 {editingProgram.versions.map((ver) => (
 <div key={ver.id} className="p-3 bg-neutral-50/40 border border-neutral-100 rounded-xl flex items-start justify-between gap-3 text-[11px] hover:bg-neutral-50/10 transition font-sans">
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <span className="font-extrabold text-danger">{ver.version}</span>
 <span className="text-neutral-600 font-bold">Auto Saved Change</span>
 </div>
 <p className="text-neutral-500 leading-normal">{ver.description}</p>
 <span className="text-[9px] text-neutral-500 block">{new Date(ver.createdAt).toLocaleString()}</span>
 </div>
 <button
 type="button"
 onClick={() => handleRestoreVersion(ver)}
 className="px-2.5 py-1 bg-neutral-50 hover:bg-neutral-100 text-[10px] font-bold border border-neutral-200 hover:border-neutral-200 text-neutral-700 hover:text-neutral-900 rounded-lg transition cursor-pointer"
 >
 Restore
 </button>
 </div>
 ))}
 </div>

 <div className="flex pt-2">
 <button
 type="button"
 onClick={() => setVersionModalOpen(false)}
 className="w-full py-3 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-500 hover:text-neutral-800 font-bold rounded-xl transition cursor-pointer"
 >
 Close History
 </button>
 </div>
 </div>
 </div>
 )}

 {/* ========================================================================= */}
 {/* MODAL 4: PUBLISHING WORKFLOW SETTINGS */}
 {/* ========================================================================= */}
 {publishModalOpen && editingProgram && (
 <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
 <form
 onSubmit={handlePublishSettingsSubmit}
 className="w-full max-w-md bg-white border border-neutral-200 p-6 rounded-3xl space-y-4 shadow-2xl relative text-xs"
 >
 <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
 <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
 <Share2 className="w-4 h-4 text-success" />
 <span>Publish Scope Configuration</span>
 </h3>
 <button
 type="button"
 onClick={() => setPublishModalOpen(false)}
 className="text-neutral-500 hover:text-neutral-700 cursor-pointer"
 >
 <X size={18} />
 </button>
 </div>

 <div className="space-y-4">
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase tracking-wider mb-2">Publish Target Location</label>
 <div className="grid grid-cols-2 gap-3">
 {[
 { id: 'Private', title: 'Private Plan', desc: 'Assigned by you only' },
 { id: 'Organization', title: 'Organization Library', desc: 'Accessible by all trainers' },
 { id: 'Community', title: 'Global Community', desc: 'Free public search' },
 { id: 'Marketplace', title: 'Marketplace Store', desc: 'Sell template access' }
 ].map((vis) => (
 <button
 key={vis.id}
 type="button"
 onClick={() => setFormVisibility(vis.id as any)}
 className={`p-3 border rounded-xl text-left transition cursor-pointer ${
 formVisibility === vis.id
 ? 'bg-danger-light border-red-200 text-danger font-extrabold shadow'
 : 'bg-neutral-50 border-neutral-100 text-neutral-600 hover:text-neutral-800'
 }`}
 >
 <h5 className="font-extrabold text-xs">{vis.title}</h5>
 <p className="text-[9px] text-neutral-500 font-medium leading-normal mt-0.5">{vis.desc}</p>
 </button>
 ))}
 </div>
 </div>

 {formVisibility === 'Marketplace' && (
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase tracking-wider mb-1">Marketplace License Price ($ USD)</label>
 <input
 type="number"
 min={0}
 value={publishPrice}
 onChange={(e) => setPublishPrice(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-xs text-neutral-800 outline-none"
 placeholder="e.g. 29.00"
 />
 <span className="text-[9px] text-neutral-500 block mt-1">GymFlow takes 5% processing surcharge on template sales.</span>
 </div>
 )}
 </div>

 <div className="flex gap-3 pt-3 border-t border-neutral-100">
 <button
 type="button"
 onClick={() => setPublishModalOpen(false)}
 className="flex-1 py-3.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-600 hover:text-neutral-800 font-bold rounded-xl cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="flex-1 py-3.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg cursor-pointer"
 >
 Apply Publishing
 </button>
 </div>
 </form>
 </div>
 )}
 </div>
 );
}
