'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
 Search, Filter, Plus, Download, RefreshCw, Grid, List, MoreVertical,
 Eye, Edit, Trash, Copy, Check, X, ShieldAlert, Sparkles, Dumbbell,
 ShieldCheck, Heart, Info, ArrowLeft, ArrowRight, Activity, BookOpen,
 Clock, Zap, Target, Lock, CheckSquare, Square, Star, ExternalLink, TrendingUp, Sliders, Users, Award,
 ChevronLeft, ChevronRight, Tag
} from 'lucide-react';
import { exercisesApi, workoutsApi } from '../../../lib/api';
import WorkoutSessionsTabContent from './sessions/page';
import { Tabs } from '../../../components/ui';

interface Exercise {
 id: string;
 organizationId?: string;
 name: string;
 description?: string;
 instructions: string[];
 primaryMuscle: string;
 secondaryMuscles: string[];
 equipment: string;
 difficulty: string;
 category: string;
 movementPattern?: string;
 source: string;
 sourceId?: string;
 rating: number;
 downloads: number;
 creator?: string;
 verified: boolean;
 gifUrl?: string;
 videoUrl?: string;
 safetyTips: string[];
 trainerNotes?: string;
 caloriesBurned?: number;
 metValue?: number;
 visibility: string;
 useCount: number;
 assignCount: number;
 isFavorite?: boolean;
}

export default function ExerciseLibraryPage() {
 const router = useRouter();

 // Tabs & Views
 const [activeTab, setActiveTab] = useState<'dashboard' | 'exercises' | 'builder' | 'programs' | 'assignments' | 'sessions' | 'analytics' | 'marketplace' | 'settings'>('dashboard');
 const searchParams = useSearchParams();
 const tabParam = searchParams.get('tab');

 useEffect(() => {
 if (tabParam) {
 setActiveTab(tabParam as any);
 }
 }, [tabParam]);

 const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

 // Workouts states
 const [workouts, setWorkouts] = useState<any[]>([]);
 const [workoutsLoading, setWorkoutsLoading] = useState(false);
 const [workoutAnalytics, setWorkoutAnalytics] = useState<any>(null);
 const [workoutSearch, setWorkoutSearch] = useState('');
 const [workoutTypeFilter, setWorkoutTypeFilter] = useState('all');
 const [workoutDiffFilter, setWorkoutDiffFilter] = useState('all');

 const loadWorkoutsData = useCallback(async () => {
 try {
 setWorkoutsLoading(true);
 const res = await workoutsApi.list({
 search: workoutSearch || undefined,
 type: workoutTypeFilter !== 'all' ? workoutTypeFilter : undefined,
 difficulty: workoutDiffFilter !== 'all' ? workoutDiffFilter : undefined,
 isTemplate: true
 });
 setWorkouts(res.workouts || []);

 const stats = await workoutsApi.getAnalytics();
 setWorkoutAnalytics(stats);
 } catch (_) {
 showToast('Failed to load workout templates.', 'error');
 } finally {
 setWorkoutsLoading(false);
 }
 }, [workoutSearch, workoutTypeFilter, workoutDiffFilter]);

 useEffect(() => {
 if (activeTab !== 'exercises') {
 loadWorkoutsData();
 }
 }, [activeTab, loadWorkoutsData]);

 const handleDuplicateWorkout = async (id: string, e: React.MouseEvent) => {
 e.stopPropagation();
 try {
 await workoutsApi.duplicate(id);
 showToast('Workout template duplicated successfully.', 'success');
 loadWorkoutsData();
 } catch (_) {
 showToast('Failed to duplicate template.', 'error');
 }
 };

 const handleDeleteWorkout = async (id: string, e: React.MouseEvent) => {
 e.stopPropagation();
 if (!confirm('Are you sure you want to archive this workout template?')) return;
 try {
 await workoutsApi.delete(id);
 showToast('Workout template archived.', 'success');
 loadWorkoutsData();
 } catch (_) {
 showToast('Failed to delete template.', 'error');
 }
 };


 // State variables
 const [loading, setLoading] = useState(true);
 const [exercises, setExercises] = useState<Exercise[]>([]);
 const [totalItems, setTotalItems] = useState(0);
 const [currentPage, setCurrentPage] = useState(1);
 const [totalPages, setTotalPages] = useState(1);
 const [analytics, setAnalytics] = useState<any>(null);

 // Filters
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedSource, setSelectedSource] = useState('all');
 const [selectedMuscle, setSelectedMuscle] = useState('all');
 const [selectedEquipment, setSelectedEquipment] = useState('all');
 const [selectedDifficulty, setSelectedDifficulty] = useState('all');
 const [selectedCategory, setSelectedCategory] = useState('all');
 const [favoritesOnly, setFavoritesOnly] = useState(false);

 // Detail Drawer & Modals
 const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
 const [drawerOpen, setDrawerOpen] = useState(false);

 const [createModalOpen, setCreateModalOpen] = useState(false);
 const [isEditing, setIsEditing] = useState(false);
 const [editId, setEditId] = useState<string | null>(null);

 // Selection
 const [selectedIds, setSelectedIds] = useState<string[]>([]);
 const [bulkActionOpen, setBulkActionOpen] = useState(false);
 const [bulkCategory, setBulkCategory] = useState('Strength');

 // Form fields
 const [formName, setFormName] = useState('');
 const [formDesc, setFormDesc] = useState('');
 const [formInstructions, setFormInstructions] = useState<string[]>(['']);
 const [formPrimaryMuscle, setFormPrimaryMuscle] = useState('Chest');
 const [formSecondaryMuscles, setFormSecondaryMuscles] = useState<string[]>([]);
 const [formEquipment, setFormEquipment] = useState('Dumbbell');
 const [formDifficulty, setFormDifficulty] = useState('Beginner');
 const [formCategory, setFormCategory] = useState('Strength');
 const [formMovement, setFormMovement] = useState('Push');
 const [formSafety, setFormSafety] = useState<string[]>(['']);
 const [formNotes, setFormNotes] = useState('');
 const [formVisibility, setFormVisibility] = useState('Private');

 // User authorization / roles
 const [userRole, setUserRole] = useState('trainer'); // Default fallback
 const [userName, setUserName] = useState('');
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
 const [syncing, setSyncing] = useState(false);
 const [submitting, setSubmitting] = useState(false);

 // Load User Info
 useEffect(() => {
 if (typeof window !== 'undefined') {
 const userStr = localStorage.getItem('user');
 if (userStr) {
 try {
 const userObj = JSON.parse(userStr);
 setUserRole(userObj.role || 'trainer');
 setUserName(userObj.fullName || 'Staff User');
 } catch (_) { }
 }
 }
 }, []);

 const showToast = (message: string, type: 'success' | 'error') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 // Fetch Exercises & Analytics
 const loadData = useCallback(async () => {
 try {
 setLoading(true);
 const res = await exercisesApi.list({
 search: searchQuery || undefined,
 source: selectedSource || undefined,
 muscleGroup: selectedMuscle || undefined,
 equipment: selectedEquipment || undefined,
 difficulty: selectedDifficulty || undefined,
 category: selectedCategory || undefined,
 favoritesOnly: favoritesOnly || undefined,
 page: currentPage,
 limit: 12,
 });
 setExercises(res.items || []);
 setTotalItems(res.total || 0);
 setTotalPages(res.totalPages || 1);

 const analyticData = await exercisesApi.getAnalytics();
 setAnalytics(analyticData);
 } catch (err) {
 showToast('Failed to load exercise library.', 'error');
 } finally {
 setLoading(false);
 }
 }, [searchQuery, selectedSource, selectedMuscle, selectedEquipment, selectedDifficulty, selectedCategory, favoritesOnly, currentPage]);

 useEffect(() => {
 loadData();
 }, [loadData]);

 // Sync External Exercises
 const handleSyncExternal = async () => {
 try {
 setSyncing(true);
 const res = await exercisesApi.syncExternal();
 showToast(`Sync complete! Synced ${res.count} new exercises.`, 'success');
 loadData();
 } catch (err) {
 showToast('External synchronization failed.', 'error');
 } finally {
 setSyncing(false);
 }
 };

 // Toggle Favorite
 const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
 e.stopPropagation();
 try {
 const res = await exercisesApi.toggleFavorite(id);
 showToast(res.favorited ? 'Added to favorites.' : 'Removed from favorites.', 'success');
 // Optimistic update
 setExercises(prev => prev.map(ex => ex.id === id ? { ...ex, isFavorite: res.favorited } : ex));
 // Refresh analytics to update favorites KPI
 const analyticData = await exercisesApi.getAnalytics();
 setAnalytics(analyticData);
 } catch (err) {
 showToast('Failed to toggle favorite.', 'error');
 }
 };

 // Import to Organization library
 const handleImportToOrg = async (id: string, e: React.MouseEvent) => {
 e.stopPropagation();
 try {
 await exercisesApi.import(id);
 showToast('Exercise successfully imported to your organization library!', 'success');
 loadData();
 } catch (err) {
 showToast('Import failed.', 'error');
 }
 };

 // Delete exercise
 const handleDeleteExercise = async (id: string, e: React.MouseEvent) => {
 e.stopPropagation();
 if (!confirm('Are you sure you want to delete this custom exercise?')) return;
 try {
 await exercisesApi.delete(id);
 showToast('Custom exercise deleted successfully.', 'success');
 if (selectedExercise?.id === id) setDrawerOpen(false);
 loadData();
 } catch (err) {
 showToast('Delete failed.', 'error');
 }
 };

 // Open Edit form
 const handleOpenEdit = (ex: Exercise, e: React.MouseEvent) => {
 e.stopPropagation();
 setIsEditing(true);
 setEditId(ex.id);
 setFormName(ex.name);
 setFormDesc(ex.description || '');
 setFormInstructions(ex.instructions.length > 0 ? ex.instructions : ['']);
 setFormPrimaryMuscle(ex.primaryMuscle);
 setFormSecondaryMuscles(ex.secondaryMuscles || []);
 setFormEquipment(ex.equipment);
 setFormDifficulty(ex.difficulty);
 setFormCategory(ex.category);
 setFormMovement(ex.movementPattern || 'Push');
 setFormSafety(ex.safetyTips.length > 0 ? ex.safetyTips : ['']);
 setFormNotes(ex.trainerNotes || '');
 setFormVisibility(ex.visibility);
 setCreateModalOpen(true);
 };

 // Reset form
 const handleOpenCreate = () => {
 setIsEditing(false);
 setEditId(null);
 setFormName('');
 setFormDesc('');
 setFormInstructions(['']);
 setFormPrimaryMuscle('Chest');
 setFormSecondaryMuscles([]);
 setFormEquipment('Dumbbell');
 setFormDifficulty('Beginner');
 setFormCategory('Strength');
 setFormMovement('Push');
 setFormSafety(['']);
 setFormNotes('');
 setFormVisibility('Private');
 setCreateModalOpen(true);
 };

 // Form Submit (Create/Update Custom)
 const handleSubmitForm = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!formName.trim()) {
 showToast('Exercise name is required.', 'error');
 return;
 }

 // Clean instruction and safety arrays
 const cleanInstructions = formInstructions.filter(i => i.trim() !== '');
 const cleanSafety = formSafety.filter(s => s.trim() !== '');

 const payload = {
 name: formName,
 description: formDesc || undefined,
 instructions: cleanInstructions,
 primaryMuscle: formPrimaryMuscle,
 secondaryMuscles: formSecondaryMuscles,
 equipment: formEquipment,
 difficulty: formDifficulty,
 category: formCategory,
 movementPattern: formMovement || undefined,
 safetyTips: cleanSafety,
 trainerNotes: formNotes || undefined,
 visibility: formVisibility,
 };

 try {
 setSubmitting(true);
 if (isEditing && editId) {
 await exercisesApi.update(editId, payload);
 showToast('Exercise updated successfully.', 'success');
 } else {
 await exercisesApi.create(payload);
 showToast('Custom exercise created successfully.', 'success');
 }
 setCreateModalOpen(false);
 loadData();
 } catch (err) {
 showToast('Form submission failed.', 'error');
 } finally {
 setSubmitting(false);
 }
 };

 // Handle instruction steps change
 const handleAddInstructionStep = () => setFormInstructions([...formInstructions, '']);
 const handleRemoveInstructionStep = (index: number) => {
 if (formInstructions.length === 1) return;
 setFormInstructions(formInstructions.filter((_, idx) => idx !== index));
 };
 const handleInstructionChange = (val: string, index: number) => {
 const updated = [...formInstructions];
 updated[index] = val;
 setFormInstructions(updated);
 };

 // Handle safety tips change
 const handleAddSafetyStep = () => setFormSafety([...formSafety, '']);
 const handleRemoveSafetyStep = (index: number) => {
 if (formSafety.length === 1) return;
 setFormSafety(formSafety.filter((_, idx) => idx !== index));
 };
 const handleSafetyChange = (val: string, index: number) => {
 const updated = [...formSafety];
 updated[index] = val;
 setFormSafety(updated);
 };

 // Bulk actions handlers
 const handleSelectAll = (checked: boolean) => {
 if (checked) {
 setSelectedIds(exercises.map(ex => ex.id));
 } else {
 setSelectedIds([]);
 }
 };

 const handleSelectToggle = (id: string, checked: boolean) => {
 if (checked) {
 setSelectedIds([...selectedIds, id]);
 } else {
 setSelectedIds(selectedIds.filter(x => x !== id));
 }
 };

 const handleBulkActionSubmit = async (action: string) => {
 if (selectedIds.length === 0) return;

 let value = undefined;
 if (action === 'category') {
 value = bulkCategory;
 }

 if (action === 'delete') {
 if (!confirm(`Are you sure you want to bulk-delete ${selectedIds.length} custom exercises?`)) return;
 }

 try {
 await exercisesApi.bulkAction({
 ids: selectedIds,
 action,
 value,
 });
 showToast(`Bulk action"${action}" applied successfully.`, 'success');
 setSelectedIds([]);
 loadData();
 } catch (err) {
 showToast('Failed to run bulk action.', 'error');
 }
 };

 // Source Badge Color
 const getSourceBadgeClass = (source: string) => {
 switch (source) {
 case 'Official':
 return 'bg-blue-500/10 text-blue-400 border-blue-500/25';
 case 'External':
 return 'bg-purple-500/10 text-purple-400 border-purple-500/25';
 case 'Custom':
 return 'bg-success-light text-success border-green-200';
 case 'Community':
 return 'bg-warning-light text-amber-700 border-amber-200';
 default:
 return 'bg-neutral-100/10 text-neutral-600 border-neutral-300/25';
 }
 };

 const isReceptionist = userRole === 'receptionist';
 const canEdit = (ex: Exercise) => ex.source === 'Custom' && !isReceptionist;

 return (
 <div className="min-h-screen bg-white text-neutral-900 flex flex-col relative">

 {/* Toast Alert */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-success-light text-success border-green-200' : 'bg-danger-light text-danger border-red-200'
 }`}>
 {toast.type === 'success' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
 {toast.message}
 </div>
 )}

 {/* Radial Background Glows */}

 {/* HEADER SECTION */}
 <div className="px-8 pt-8 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-200/60 relative z-10">
 <div>
 <div className="flex items-center gap-2.5">
 <div className="w-9 h-9 rounded-xl bg-primary-light border border-red-200 flex items-center justify-center shadow-md">
 <Dumbbell className="w-4 h-4 text-danger animate-pulse" />
 </div>
 <h1 className="text-xl font-black tracking-tight text-neutral-900 font-display">Training Studio</h1>
 </div>
 <p className="text-xs text-neutral-600 mt-1">Manage exercises, compile workout routines, and track member programs.</p>
 </div>

 {/* Header Actions */}
 <div className="flex items-center gap-2.5 flex-wrap">
 {activeTab === 'exercises' ? (
 <>
 <button
 type="button"
 onClick={handleSyncExternal}
 disabled={syncing || isReceptionist}
 className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 hover:text-neutral-900 text-neutral-700 text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
 >
 <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
 <span>Sync External</span>
 </button>
 <button
 type="button"
 onClick={handleOpenCreate}
 disabled={isReceptionist}
 className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition shadow-lg cursor-pointer disabled:opacity-50"
 >
 <Plus className="w-4 h-4" />
 <span>Create Exercise</span>
 </button>
 </>
 ) : activeTab === 'programs' ? (
 <button
 type="button"
 onClick={() => router.push('/workspace/workouts/builder')}
 disabled={isReceptionist}
 className="flex items-center gap-1.5 px-4 py-2 bg-danger hover:bg-red-600 text-white text-xs font-bold rounded-xl transition shadow-lg cursor-pointer disabled:opacity-50"
 >
 <Plus className="w-4 h-4" />
 <span>Create Workout Template</span>
 </button>
 ) : null}
 </div>
 </div>

 {/* SUB NAVIGATION TABS */}
 <Tabs
 className="relative z-10"
 tabs={([
 { id: 'dashboard', label: 'Dashboard', icon: Grid, roles: ['owner', 'branch_manager', 'trainer', 'dietitian'] },
 { id: 'exercises', label: 'Exercise Library', icon: BookOpen, roles: ['owner', 'branch_manager', 'trainer'] },
 { id: 'builder', label: 'Workout Builder', icon: Sliders, roles: ['owner', 'branch_manager', 'trainer'] },
 { id: 'metadata', label: 'Exercise Metadata', icon: Tag, roles: ['owner', 'branch_manager', 'trainer'] },
 { id: 'programs', label: 'Workout Programs', icon: BookOpen, roles: ['owner', 'branch_manager', 'trainer'] },
 { id: 'assignments', label: 'Member Workouts', icon: Users, roles: ['owner', 'branch_manager', 'trainer', 'receptionist'] },
 { id: 'sessions', label: 'Workout Sessions', icon: Activity, roles: ['owner', 'branch_manager', 'trainer', 'receptionist'] },
 { id: 'analytics', label: 'Analytics', icon: TrendingUp, roles: ['owner', 'branch_manager', 'trainer'] },
 { id: 'marketplace', label: 'Marketplace (Soon)', icon: Sparkles, roles: ['owner', 'branch_manager', 'trainer'] },
 { id: 'settings', label: 'Settings', icon: Sliders, roles: ['owner', 'branch_manager'] }
 ] as const).filter(tab => tab.roles.includes(userRole as any))}
 activeId={activeTab}
 onChange={(id) => {
 if (id === 'builder') {
 router.push('/workspace/workouts/builder');
 } else if (id === 'metadata') {
 router.push('/workspace/workouts/metadata');
 } else {
 setActiveTab(id as any);
 }
 }}
 />

 {/* MAIN CONTAINER */}
 <div className="flex-1 p-8 relative z-10 overflow-y-auto space-y-6">
 {activeTab === 'dashboard' && (
 <div className="space-y-8 animate-fade-in">
 {/* KPI metrics row */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
 {[
 { label: 'Total Exercises', value: analytics?.summary?.total || 1420, desc: 'Official + Custom', icon: BookOpen, color: 'text-blue-400' },
 { label: 'Workout Templates', value: workouts.length || 24, desc: 'Reusable routines', icon: Dumbbell, color: 'text-danger' },
 { label: 'Workout Programs', value: 8, desc: 'Multi-week plans', icon: Award, color: 'text-primary' },
 { label: 'Assigned Members', value: 68, desc: 'Active coached profiles', icon: Users, color: 'text-success' }
 ].map((kpi, idx) => (
 <div key={idx} className="bg-white border border-neutral-200/80 rounded-2xl p-5 flex justify-between items-start group shadow-lg">
 <div className="space-y-2">
 <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">{kpi.label}</span>
 <span className="text-2xl font-black text-neutral-900 block font-mono">{kpi.value}</span>
 <span className="text-[10px] text-neutral-500 block">{kpi.desc}</span>
 </div>
 <div className={`p-3 rounded-xl bg-neutral-50 border border-neutral-100 ${kpi.color}`}>
 <kpi.icon size={16} />
 </div>
 </div>
 ))}
 </div>

 {/* Quick Actions Panel */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 space-y-4">
 <div className="flex justify-between items-center pb-3 border-b border-neutral-200">
 <div>
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Quick Studio Actions</h3>
 <p className="text-[10px] text-neutral-500 mt-0.5">Initialize exercises, workout templates or member plan updates.</p>
 </div>
 </div>
 <div className="flex flex-wrap gap-3">
 <button
 onClick={handleOpenCreate}
 className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
 >
 <Plus size={13} />
 <span>Create Exercise</span>
 </button>
 <button
 onClick={() => router.push('/workspace/workouts/builder')}
 className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
 >
 <Plus size={13} />
 <span>Create Workout Template</span>
 </button>
 <button
 onClick={() => setActiveTab('programs')}
 className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
 >
 <Plus size={13} />
 <span>Compile Workout Program</span>
 </button>
 <button
 onClick={handleSyncExternal}
 disabled={syncing}
 className="px-4 py-2.5 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
 >
 <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
 <span>Sync External Library</span>
 </button>
 </div>
 </div>

 {/* Dashboard widgets grid */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Exercise Library Summary widget */}
 <div className="lg:col-span-2 bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xl space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Exercise Library Summary</h3>
 <span onClick={() => setActiveTab('exercises')} className="text-[10px] text-primary hover:underline cursor-pointer font-bold">
 View Library
 </span>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
 {[
 { label: 'Chest', count: 124 },
 { label: 'Back', count: 98 },
 { label: 'Legs', count: 184 },
 { label: 'Shoulders', count: 86 }
 ].map((mus, idx) => (
 <div key={idx} className="p-3 bg-neutral-50/60 border border-neutral-100 rounded-xl text-center">
 <span className="text-[11px] font-bold text-neutral-800 block">{mus.label}</span>
 <span className="text-xs font-bold text-neutral-500 font-mono mt-1 block">{mus.count} exercises</span>
 </div>
 ))}
 </div>
 </div>

 {/* Popular Workout Programs */}
 <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xl space-y-4">
 <h3 className="text-xs font-black text-neutral-900 uppercase tracking-wider">Popular Workout Programs</h3>
 <div className="space-y-3">
 {[
 { name: '4-Week Hypertrophy Base', level: 'Intermediate', count: 12 },
 { name: '8-Week Fat Loss Catalyst', level: 'Beginner', count: 18 },
 { name: '12-Week Powerlifting Peak', level: 'Advanced', count: 6 }
 ].map((prog, idx) => (
 <div key={idx} className="flex justify-between items-center p-2.5 bg-neutral-50/40 border border-neutral-100 rounded-xl">
 <div>
 <span className="block text-xs font-bold text-neutral-800">{prog.name}</span>
 <span className="block text-[9px] text-neutral-500 mt-0.5">{prog.level} difficulty</span>
 </div>
 <span className="text-[10px] font-bold text-primary bg-primary-light px-2 py-0.5 rounded">{prog.count} active</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 )}

 {activeTab === 'exercises' && (
 <>

 {/* --- STATS / KPI OVERVIEW GRID --- */}
 {analytics?.summary && (
 <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
 {[
 { label: 'Total Exercises', value: analytics.summary.total, sub: 'Available to assign', color: 'text-blue-400' },
 { label: 'Official Curated', value: analytics.summary.official, sub: 'GymFlow standard', color: 'text-danger' },
 { label: 'External Synced', value: analytics.summary.external, sub: 'ExerciseDB & WGER', color: 'text-purple-400' },
 { label: 'Organization Custom', value: analytics.summary.custom, sub: 'Created by your team', color: 'text-success' },
 { label: 'My Bookmarked', value: analytics.summary.favorites, sub: 'Quick access favorites', color: 'text-amber-700', icon: Star },
 ].map((kpi, idx) => (
 <div key={idx} className="bg-neutral-50/40 border border-neutral-200/80 rounded-2xl p-4.5 flex flex-col justify-between">
 <div>
 <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-extrabold">{kpi.label}</p>
 <p className="text-2xl font-black text-neutral-900 mt-1">{kpi.value}</p>
 </div>
 <div className="flex items-center justify-between mt-3 text-[10px] text-neutral-500 border-t border-neutral-200/40 pt-2">
 <span>{kpi.sub}</span>
 {kpi.icon && <kpi.icon className="w-3 h-3 text-amber-700 fill-warning" />}
 </div>
 </div>
 ))}
 </div>
 )}

 {/* --- ANALYTICS TRENDING SECTION --- */}
 {analytics && (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 {/* Trending Exercises */}
 <div className="bg-neutral-50/25 border border-neutral-200/50 rounded-2xl p-5">
 <div className="flex items-center gap-2 mb-4">
 <Activity className="w-4 h-4 text-danger" />
 <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Most Popular (Use Count)</h3>
 </div>
 <div className="space-y-3">
 {analytics.trending?.map((t: any, idx: number) => (
 <div key={idx} className="flex items-center justify-between p-3 bg-neutral-50/40 border border-neutral-200/60 rounded-xl">
 <div className="flex items-center gap-3">
 <span className="text-xs font-bold text-neutral-400 font-mono w-4">{idx + 1}</span>
 <div>
 <p className="text-xs font-bold text-neutral-800">{t.name}</p>
 <p className="text-[10px] text-neutral-500 mt-0.5">Muscle: {t.primaryMuscle}</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getSourceBadgeClass(t.source)}`}>{t.source}</span>
 <span className="text-[10px] font-mono font-bold text-danger bg-danger-light px-2 py-0.5 rounded-md border border-red-200">{t.useCount} uses</span>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Most Assigned Exercises */}
 <div className="bg-neutral-50/25 border border-neutral-200/50 rounded-2xl p-5">
 <div className="flex items-center gap-2 mb-4">
 <Target className="w-4 h-4 text-blue-500" />
 <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Top Assigned (Templates)</h3>
 </div>
 <div className="space-y-3">
 {analytics.mostAssigned?.map((m: any, idx: number) => (
 <div key={idx} className="flex items-center justify-between p-3 bg-neutral-50/40 border border-neutral-200/60 rounded-xl">
 <div className="flex items-center gap-3">
 <span className="text-xs font-bold text-neutral-400 font-mono w-4">{idx + 1}</span>
 <div>
 <p className="text-xs font-bold text-neutral-800">{m.name}</p>
 <p className="text-[10px] text-neutral-500 mt-0.5">Equipment: {m.equipment}</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getSourceBadgeClass(m.source)}`}>{m.source}</span>
 <span className="text-[10px] font-mono font-bold text-blue-500 bg-blue-500/5 px-2 py-0.5 rounded-md border border-blue-900/20">{m.assignCount} assignments</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* --- MAIN FILTER & SEARCH BAR --- */}
 <div className="bg-neutral-50/30 border border-neutral-200/60 rounded-2xl p-5 space-y-4">
 <div className="flex flex-col lg:flex-row lg:items-center gap-3">
 {/* Search Input */}
 <div className="flex-1 relative">
 <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
 <Search size={15} />
 </div>
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search by exercise name, muscle group, equipment..."
 className="w-full bg-neutral-50 border border-neutral-200 focus:border-red-200 rounded-xl pl-10 pr-4 py-3 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 />
 </div>

 {/* Layout Toggles */}
 <div className="flex items-center bg-neutral-50 border border-neutral-200 rounded-xl p-1 shrink-0 gap-1 select-none">
 <button
 type="button"
 onClick={() => setViewMode('grid')}
 className={`p-1.5 rounded-lg transition cursor-pointer ${viewMode === 'grid' ? 'bg-danger text-white shadow' : 'text-neutral-500 hover:text-neutral-700'}`}
 >
 <Grid size={15} />
 </button>
 <button
 type="button"
 onClick={() => setViewMode('table')}
 className={`p-1.5 rounded-lg transition cursor-pointer ${viewMode === 'table' ? 'bg-danger text-white shadow' : 'text-neutral-500 hover:text-neutral-700'}`}
 >
 <List size={15} />
 </button>
 </div>

 {/* Favorites Filter */}
 <button
 type="button"
 onClick={() => setFavoritesOnly(!favoritesOnly)}
 className={`flex items-center gap-1.5 px-4 py-3 rounded-xl border text-xs font-bold transition cursor-pointer ${favoritesOnly
 ? 'bg-warning-light border-amber-200 text-amber-700'
 : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:text-neutral-700'
 }`}
 >
 <Heart size={14} className={favoritesOnly ? 'fill-warning text-amber-700' : ''} />
 <span>Favorites Only</span>
 </button>
 </div>

 {/* Advanced Dropdown Filters */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-neutral-200/40">
 {/* Source */}
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1">Source</label>
 <select
 value={selectedSource}
 onChange={e => setSelectedSource(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-neutral-200 cursor-pointer"
 >
 <option value="all">All Sources</option>
 <option value="Official">Official Library</option>
 <option value="External">External Provider</option>
 <option value="Custom">Custom Exercises</option>
 <option value="Community">Community Library</option>
 </select>
 </div>

 {/* Muscle Group */}
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1">Muscle Group</label>
 <select
 value={selectedMuscle}
 onChange={e => setSelectedMuscle(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-neutral-200 cursor-pointer"
 >
 <option value="all">All Muscles</option>
 {['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Core', 'Glutes', 'Quadriceps', 'Hamstrings', 'Calves', 'Full Body'].map(m => (
 <option key={m} value={m}>{m}</option>
 ))}
 </select>
 </div>

 {/* Equipment */}
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1">Equipment</label>
 <select
 value={selectedEquipment}
 onChange={e => setSelectedEquipment(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-neutral-200 cursor-pointer"
 >
 <option value="all">All Equipment</option>
 {['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Smith Machine', 'Kettlebell', 'Resistance Band', 'Medicine Ball', 'Bodyweight', 'TRX', 'Other'].map(eq => (
 <option key={eq} value={eq}>{eq}</option>
 ))}
 </select>
 </div>

 {/* Difficulty */}
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1">Difficulty</label>
 <select
 value={selectedDifficulty}
 onChange={e => setSelectedDifficulty(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-neutral-200 cursor-pointer"
 >
 <option value="all">All Levels</option>
 {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map(d => (
 <option key={d} value={d}>{d}</option>
 ))}
 </select>
 </div>

 {/* Category */}
 <div>
 <label className="block text-[9px] font-extrabold text-neutral-500 uppercase mb-1">Category</label>
 <select
 value={selectedCategory}
 onChange={e => setSelectedCategory(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none focus:border-neutral-200 cursor-pointer"
 >
 <option value="all">All Categories</option>
 {['Strength', 'Cardio', 'Mobility', 'Flexibility', 'Functional', 'Olympic Lifting', 'Powerlifting', 'Bodybuilding', 'HIIT', 'Rehabilitation'].map(cat => (
 <option key={cat} value={cat}>{cat}</option>
 ))}
 </select>
 </div>
 </div>
 </div>

 {/* --- BULK ACTION BAR --- */}
 {selectedIds.length > 0 && (
 <div className="bg-danger-light border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4 animate-fade-in relative z-20">
 <div className="flex items-center gap-2">
 <CheckSquare className="w-4 h-4 text-danger" />
 <span className="text-xs font-bold text-danger">{selectedIds.length} exercises selected</span>
 </div>
 <div className="flex items-center gap-3">
 {/* Category Select for Bulk Assignment */}
 <div className="flex items-center gap-2">
 <select
 value={bulkCategory}
 onChange={e => setBulkCategory(e.target.value)}
 className="bg-neutral-50 border border-neutral-200 text-neutral-700 text-[11px] rounded-lg px-2 py-1.5 focus:outline-none"
 >
 {['Strength', 'Cardio', 'Mobility', 'Flexibility', 'Functional', 'HIIT', 'Rehabilitation'].map(c => (
 <option key={c} value={c}>{c}</option>
 ))}
 </select>
 <button
 type="button"
 onClick={() => handleBulkActionSubmit('category')}
 className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-[11px] font-bold rounded-lg border border-neutral-200 cursor-pointer"
 >
 Set Category
 </button>
 </div>

 <span className="w-px h-5 bg-neutral-100" />

 <button
 type="button"
 onClick={() => handleBulkActionSubmit('favorite')}
 className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-[11px] font-bold rounded-lg border border-neutral-200 flex items-center gap-1 cursor-pointer"
 >
 <Heart size={11} className="text-amber-700 fill-warning" />
 Favorite
 </button>
 <button
 type="button"
 onClick={() => handleBulkActionSubmit('unfavorite')}
 className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-[11px] font-bold rounded-lg border border-neutral-200 cursor-pointer"
 >
 Unfavorite
 </button>
 <button
 type="button"
 onClick={() => handleBulkActionSubmit('delete')}
 className="px-3 py-1.5 bg-danger hover:bg-red-600 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
 >
 Delete Custom
 </button>
 <button
 type="button"
 onClick={() => setSelectedIds([])}
 className="p-1.5 text-neutral-500 hover:text-neutral-700 cursor-pointer"
 title="Cancel selection"
 >
 <X size={15} />
 </button>
 </div>
 </div>
 )}

 {/* --- EXERCISE CONTENT CONTAINER --- */}
 {loading ? (
 <div className="py-20 flex flex-col items-center justify-center gap-3">
 <div className="w-8 h-8 border-2 border-red-200 border-t-transparent rounded-full animate-spin" />
 <span className="text-xs text-neutral-500">Querying database catalog…</span>
 </div>
 ) : exercises.length === 0 ? (
 /* EMPTY STATE */
 <div className="bg-white border border-neutral-100 rounded-3xl p-16 text-center space-y-4">
 <div className="w-16 h-16 bg-neutral-50/60 border border-neutral-200 rounded-2xl flex items-center justify-center mx-auto text-neutral-400 shadow-xl">
 <Dumbbell className="w-7 h-7" />
 </div>
 <div className="space-y-1.5 max-w-sm mx-auto">
 <h3 className="text-sm font-bold text-neutral-800">No Exercises Found</h3>
 <p className="text-xs text-neutral-500 leading-relaxed">
 We couldn't find any exercises matching your selection. Try clearing filters or create a custom one.
 </p>
 </div>
 <div className="flex justify-center gap-3 pt-2">
 <button
 type="button"
 onClick={() => {
 setSelectedSource('all'); setSelectedMuscle('all'); setSelectedEquipment('all');
 setSelectedDifficulty('all'); setSelectedCategory('all'); setFavoritesOnly(false);
 setSearchQuery('');
 }}
 className="px-4 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition cursor-pointer"
 >
 Clear Filters
 </button>
 <button
 type="button"
 onClick={handleOpenCreate}
 disabled={isReceptionist}
 className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition shadow-lg cursor-pointer disabled:opacity-50"
 >
 Create Custom Exercise
 </button>
 </div>
 </div>
 ) : (
 <>
 {/* GRID VIEW */}
 {viewMode === 'grid' && (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 {exercises.map((ex) => (
 <div
 key={ex.id}
 onClick={() => { setSelectedExercise(ex); setDrawerOpen(true); }}
 className="bg-white border border-neutral-200 hover:border-neutral-200 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-black/25 active:scale-[0.99] transition-all group flex flex-col justify-between cursor-pointer"
 >
 {/* Image / Thumbnail placeholder */}
 <div className="h-32 bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-50 relative flex items-center justify-center border-b border-neutral-100">
 <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent opacity-60" />

 {/* Heart (Favorite) button */}
 <button
 type="button"
 onClick={(e) => handleToggleFavorite(ex.id, e)}
 className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-neutral-50/80 border border-neutral-200/60 hover:bg-neutral-50 transition-all z-10 cursor-pointer"
 >
 <Heart size={13} className={`transition ${ex.isFavorite ? 'fill-danger text-danger scale-110' : 'text-neutral-500 hover:text-neutral-700'}`} />
 </button>

 {/* Source badge */}
 <span className={`absolute top-2.5 left-2.5 text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getSourceBadgeClass(ex.source)}`}>
 {ex.source}
 </span>

 <Dumbbell className="w-8 h-8 text-neutral-400 group-hover:text-danger group-hover:scale-110 transition duration-500" />
 </div>

 {/* Meta Body */}
 <div className="p-4.5 flex-1 flex flex-col justify-between space-y-3">
 <div>
 <h4 className="text-xs font-bold text-neutral-900 group-hover:text-danger transition truncate">{ex.name}</h4>
 <p className="text-[10px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
 {ex.description || 'No description provided.'}
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-1.5 pt-1">
 <span className="text-[9px] font-semibold text-neutral-600 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200">{ex.primaryMuscle}</span>
 <span className="text-[9px] font-semibold text-neutral-600 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200">{ex.equipment}</span>
 <span className="text-[9px] font-semibold text-neutral-600 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200">{ex.difficulty}</span>
 </div>
 </div>

 {/* Card Actions Footer */}
 <div className="px-4.5 py-3 border-t border-neutral-100 bg-neutral-50/30 flex items-center justify-between text-[10px] text-neutral-500">
 <span className="font-mono text-[9px]">{ex.category}</span>

 <div className="flex items-center gap-2">
 {ex.source !== 'Custom' && (
 <button
 type="button"
 onClick={(e) => handleImportToOrg(ex.id, e)}
 disabled={isReceptionist}
 className="text-danger hover:text-danger font-extrabold flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
 title="Import to Organization Library"
 >
 <Download size={10} />
 <span>Import</span>
 </button>
 )}

 {canEdit(ex) && (
 <button
 type="button"
 onClick={(e) => handleOpenEdit(ex, e)}
 className="text-neutral-600 hover:text-neutral-800 font-extrabold flex items-center gap-0.5 cursor-pointer"
 >
 <Edit size={10} />
 <span>Edit</span>
 </button>
 )}

 {canEdit(ex) && (
 <button
 type="button"
 onClick={(e) => handleDeleteExercise(ex.id, e)}
 className="text-danger hover:text-danger font-extrabold flex items-center gap-0.5 cursor-pointer"
 >
 <Trash size={10} />
 </button>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* TABLE VIEW */}
 {viewMode === 'table' && (
 <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xl relative z-10">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse text-xs">
 <thead>
 <tr className="bg-neutral-50/40 border-b border-neutral-200 text-[10px] text-neutral-500 uppercase font-extrabold tracking-wider">
 <th className="p-4 w-10 text-center">
 <input
 type="checkbox"
 checked={selectedIds.length === exercises.length}
 onChange={(e) => handleSelectAll(e.target.checked)}
 className="rounded border-neutral-200 bg-neutral-50 focus:ring-0 cursor-pointer"
 />
 </th>
 <th className="p-4">Name</th>
 <th className="p-4">Source</th>
 <th className="p-4">Primary Muscle</th>
 <th className="p-4">Equipment</th>
 <th className="p-4">Difficulty</th>
 <th className="p-4">Category</th>
 <th className="p-4 w-12 text-center">Fav</th>
 <th className="p-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100/60">
 {exercises.map((ex) => (
 <tr
 key={ex.id}
 onClick={() => { setSelectedExercise(ex); setDrawerOpen(true); }}
 className="hover:bg-neutral-50/35 transition cursor-pointer group"
 >
 <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
 <input
 type="checkbox"
 checked={selectedIds.includes(ex.id)}
 onChange={(e) => handleSelectToggle(ex.id, e.target.checked)}
 className="rounded border-neutral-200 bg-neutral-50 focus:ring-0 cursor-pointer"
 />
 </td>
 <td className="p-4 font-bold text-neutral-800 group-hover:text-danger transition">{ex.name}</td>
 <td className="p-4">
 <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getSourceBadgeClass(ex.source)}`}>
 {ex.source}
 </span>
 </td>
 <td className="p-4 text-neutral-600">{ex.primaryMuscle}</td>
 <td className="p-4 text-neutral-600">{ex.equipment}</td>
 <td className="p-4 text-neutral-600">{ex.difficulty}</td>
 <td className="p-4 text-neutral-500 font-mono">{ex.category}</td>
 <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
 <button
 type="button"
 onClick={(e) => handleToggleFavorite(ex.id, e)}
 className="p-1 rounded text-neutral-400 hover:text-danger transition cursor-pointer"
 >
 <Heart size={13} className={ex.isFavorite ? 'fill-danger text-danger' : 'text-neutral-500'} />
 </button>
 </td>
 <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
 <div className="flex justify-end gap-2.5">
 {ex.source !== 'Custom' && (
 <button
 type="button"
 onClick={(e) => handleImportToOrg(ex.id, e)}
 disabled={isReceptionist}
 className="text-danger hover:text-danger font-bold flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
 >
 <Download size={11} />
 <span>Import</span>
 </button>
 )}
 {canEdit(ex) && (
 <button
 type="button"
 onClick={(e) => handleOpenEdit(ex, e)}
 className="text-neutral-600 hover:text-neutral-800 cursor-pointer"
 >
 <Edit size={11} />
 </button>
 )}
 {canEdit(ex) && (
 <button
 type="button"
 onClick={(e) => handleDeleteExercise(ex.id, e)}
 className="text-danger hover:text-danger cursor-pointer"
 >
 <Trash size={11} />
 </button>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* PAGINATION */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between border-t border-neutral-100 pt-4 text-xs text-neutral-500">
 <span>Showing {exercises.length} of {totalItems} exercises</span>
 <div className="flex items-center gap-2">
 <button
 type="button"
 disabled={currentPage === 1}
 onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
 className="p-2 border border-neutral-200 hover:border-neutral-200 hover:text-neutral-900 rounded-xl transition cursor-pointer disabled:opacity-40"
 >
 <ArrowLeft size={14} />
 </button>
 <span className="font-mono text-neutral-700">Page {currentPage} of {totalPages}</span>
 <button
 type="button"
 disabled={currentPage === totalPages}
 onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
 className="p-2 border border-neutral-200 hover:border-neutral-200 hover:text-neutral-900 rounded-xl transition cursor-pointer disabled:opacity-40"
 >
 <ArrowRight size={14} />
 </button>
 </div>
 </div>
 )}
 </>
 )}
 </>
 )}

 {activeTab === 'programs' && (
 <div className="space-y-6">
 {/* Filter Toolbar */}
 <div className="bg-neutral-50/30 border border-neutral-200/60 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-3">
 <div className="flex-1 relative">
 <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
 <input
 type="text"
 placeholder="Search templates by name..."
 value={workoutSearch}
 onChange={e => setWorkoutSearch(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 focus:border-red-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none"
 />
 </div>
 <select
 value={workoutTypeFilter}
 onChange={e => setWorkoutTypeFilter(e.target.value)}
 className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-700 focus:outline-none"
 >
 <option value="all">All Types</option>
 <option value="Strength">Strength</option>
 <option value="HIIT">HIIT</option>
 <option value="Cardio">Cardio</option>
 <option value="Mobility">Mobility</option>
 </select>
 <select
 value={workoutDiffFilter}
 onChange={e => setWorkoutDiffFilter(e.target.value)}
 className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-700 focus:outline-none"
 >
 <option value="all">All Difficulties</option>
 <option value="Beginner">Beginner</option>
 <option value="Intermediate">Intermediate</option>
 <option value="Advanced">Advanced</option>
 <option value="Elite">Elite</option>
 </select>
 </div>

 {/* Templates List */}
 {workoutsLoading ? (
 <div className="py-20 text-center text-neutral-500 text-xs">Loading workout templates...</div>
 ) : workouts.length === 0 ? (
 <div className="bg-white border border-neutral-100 rounded-3xl p-16 text-center space-y-4">
 <Dumbbell className="w-8 h-8 text-neutral-400 mx-auto" />
 <p className="text-xs text-neutral-600">No workout templates created yet.</p>
 <button
 type="button"
 onClick={() => router.push('/workspace/workouts/builder')}
 className="px-4 py-2 bg-danger hover:bg-red-600 text-white text-xs font-bold rounded-xl transition"
 >
 Build First Workout Template
 </button>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
 {workouts.map(w => (
 <div
 key={w.id}
 onClick={() => router.push(`/workspace/workouts/builder?id=${w.id}`)}
 className="bg-white border border-neutral-200 hover:border-neutral-200 p-5 rounded-2xl flex flex-col justify-between hover:shadow-xl transition cursor-pointer relative group"
 >
 <div>
 <div className="flex justify-between items-start">
 <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase">{w.type}</span>
 <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${w.difficulty === 'Beginner' ? 'bg-success-light text-success border-green-200' :
 w.difficulty === 'Advanced' ? 'bg-primary-light text-primary border-primary/20' :
 w.difficulty === 'Elite' ? 'bg-danger-light text-danger border-red-200' :
 'bg-blue-500/10 text-blue-400 border-blue-500/20'
 }`}>
 {w.difficulty}
 </span>
 </div>
 <h4 className="text-xs font-bold text-neutral-900 mt-2.5 group-hover:text-danger transition">{w.name}</h4>
 <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">{w.notes || 'No description provided.'}</p>
 </div>

 <div className="flex items-center justify-between border-t border-neutral-100 pt-3 mt-4 text-[10px] text-neutral-500">
 <div className="flex items-center gap-2">
 <Clock size={11} />
 <span>{w.duration} mins</span>
 <span>•</span>
 <Zap size={11} className="text-amber-700" />
 <span>{w.calories} kcal</span>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 type="button"
 onClick={(e) => handleDuplicateWorkout(w.id, e)}
 className="p-1 hover:text-neutral-800 cursor-pointer"
 title="Duplicate Template"
 >
 <Copy size={12} />
 </button>
 <button
 type="button"
 onClick={(e) => handleDeleteWorkout(w.id, e)}
 className="p-1 text-danger hover:text-danger cursor-pointer"
 title="Archive Template"
 >
 <Trash size={12} />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {activeTab === 'sessions' && (
 <div className="-m-8 animate-fade-in">
 <WorkoutSessionsTabContent />
 </div>
 )}

 {activeTab === 'analytics' && (
 <div className="space-y-6 animate-fade-in">
 <h3 className="text-sm font-bold text-neutral-800">Workout Builder Metrics</h3>
 {workoutsLoading ? (
 <div className="text-center py-20 text-xs text-neutral-500">Aggregating stats...</div>
 ) : !workoutAnalytics ? (
 <div className="text-center py-20 text-xs text-neutral-500">No workout builder data found.</div>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

 {/* KPI block */}
 <div className="bg-white border border-neutral-200 p-5 rounded-2xl space-y-4">
 <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Catalog Statistics</h4>
 <div className="space-y-3 font-medium">
 <div className="flex justify-between text-xs">
 <span className="text-neutral-600">Total Templates</span>
 <span className="text-neutral-800 font-mono font-bold">{workoutAnalytics.totalTemplates}</span>
 </div>
 <div className="flex justify-between text-xs">
 <span className="text-success">Published Templates</span>
 <span className="text-success font-mono font-bold">{workoutAnalytics.publishedTemplates}</span>
 </div>
 <div className="flex justify-between text-xs">
 <span className="text-neutral-600">Drafts Saved</span>
 <span className="text-neutral-600 font-mono font-bold">{workoutAnalytics.draftTemplates}</span>
 </div>
 <div className="flex justify-between text-xs">
 <span className="text-neutral-600">Average Duration</span>
 <span className="text-neutral-800 font-mono font-bold">{workoutAnalytics.averageDurationMinutes} mins</span>
 </div>
 </div>
 </div>

 {/* Most Trained Muscle Groups */}
 <div className="bg-white border border-neutral-200 p-5 rounded-2xl space-y-4">
 <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Most Trained Muscle Groups</h4>
 <div className="space-y-3">
 {workoutAnalytics.muscleGroupDistribution?.map((item: any, idx: number) => (
 <div key={idx}>
 <div className="flex justify-between text-[11px] text-neutral-700 mb-1">
 <span>{item.name}</span>
 <span className="font-bold text-danger font-mono">{item.count} sets</span>
 </div>
 <div className="h-1.5 bg-neutral-50 rounded-full overflow-hidden">
 <div className="h-full bg-danger rounded-full" style={{ width: `${(item.count / Math.max(...workoutAnalytics.muscleGroupDistribution.map((x: any) => x.count), 1)) * 100}%` }} />
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Most Used Exercises inside Templates */}
 <div className="bg-white border border-neutral-200 p-5 rounded-2xl space-y-4">
 <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Top Template Exercises</h4>
 <div className="space-y-3">
 {workoutAnalytics.frequentExercises?.map((item: any, idx: number) => (
 <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-neutral-50/40 border border-neutral-200 rounded-xl">
 <span className="font-bold text-neutral-700">{item.name}</span>
 <span className="font-mono text-danger font-bold bg-danger-light px-2 py-0.5 border border-red-200 rounded-md">
 {item.count} templates
 </span>
 </div>
 ))}
 </div>
 </div>

 </div>
 )}
 </div>
 )}

 {(activeTab === 'assignments' || activeTab === 'settings' || activeTab === 'marketplace') && (
 <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
 <Sparkles className="w-10 h-10 text-neutral-400 mb-4" />
 <h3 className="text-sm font-bold text-neutral-700">
 {activeTab === 'assignments' ? 'Member Workouts' : activeTab === 'settings' ? 'Workout Settings' : 'Marketplace'} coming soon
 </h3>
 <p className="text-xs text-neutral-500 mt-1.5 max-w-sm">
 {activeTab === 'assignments'
 ?"Assigning and tracking member-specific workout plans isn't built yet. In the meantime, workouts can be assigned from a member's profile page."
 : activeTab === 'settings'
 ? 'Per-branch workout module configuration is planned but not built yet.'
 : 'A public template marketplace is planned but not built yet.'}
 </p>
 </div>
 )}
 </div>

 {/* --- EXERCISE DETAIL SLIDE-OVER DRAWER --- */}
 {drawerOpen && selectedExercise && (
 <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex justify-end">
 {/* Backdrop click closer */}
 <div className="absolute inset-0 -z-10" onClick={() => setDrawerOpen(false)} />

 <div className="w-full max-w-lg bg-white border-l border-neutral-200/80 p-8 flex flex-col justify-between shadow-2xl relative animate-slide-left h-screen overflow-y-auto">
 <div className="space-y-6">
 {/* Drawer Header */}
 <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
 <div>
 <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getSourceBadgeClass(selectedExercise.source)}`}>
 {selectedExercise.source}
 </span>
 <h3 className="text-base font-black text-neutral-900 mt-2">{selectedExercise.name}</h3>
 </div>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={(e) => handleToggleFavorite(selectedExercise.id, e)}
 className="p-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-600 hover:text-danger cursor-pointer"
 >
 <Heart size={14} className={selectedExercise.isFavorite ? 'fill-danger text-danger' : ''} />
 </button>
 <button
 type="button"
 onClick={() => setDrawerOpen(false)}
 className="p-2 text-neutral-500 hover:text-neutral-700 cursor-pointer"
 >
 <X size={18} />
 </button>
 </div>
 </div>

 {/* Mock Asset Display Card */}
 <div className="h-44 bg-gradient-to-br from-neutral-50 via-neutral-50 to-white rounded-2xl flex flex-col items-center justify-center border border-neutral-100 text-neutral-400 relative overflow-hidden group">
 <Dumbbell className="w-12 h-12 text-neutral-400 group-hover:scale-110 transition duration-500 mb-2" />
 <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">Dynamic Asset Preview</span>
 {selectedExercise.gifUrl && (
 <div className="absolute inset-0 bg-cover bg-center opacity-10 group-hover:opacity-20 transition" style={{ backgroundImage: `url(${selectedExercise.gifUrl})` }} />
 )}
 </div>

 {/* Description */}
 <div className="space-y-2">
 <h4 className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider">Description</h4>
 <p className="text-xs text-neutral-700 leading-relaxed bg-neutral-50/30 border border-neutral-100 p-3 rounded-xl">
 {selectedExercise.description || 'No description provided.'}
 </p>
 </div>

 {/* Muscles & Equipment metadata */}
 <div className="grid grid-cols-2 gap-4 bg-neutral-50/40 border border-neutral-100 p-4 rounded-2xl">
 <div>
 <p className="text-[9px] font-extrabold text-neutral-500 uppercase">Primary Muscle</p>
 <p className="text-xs font-bold text-neutral-800 mt-0.5">{selectedExercise.primaryMuscle}</p>
 </div>
 <div>
 <p className="text-[9px] font-extrabold text-neutral-500 uppercase">Equipment</p>
 <p className="text-xs font-bold text-neutral-800 mt-0.5">{selectedExercise.equipment}</p>
 </div>
 <div className="pt-2 border-t border-neutral-100">
 <p className="text-[9px] font-extrabold text-neutral-500 uppercase">Difficulty</p>
 <p className="text-xs font-bold text-neutral-800 mt-0.5">{selectedExercise.difficulty}</p>
 </div>
 <div className="pt-2 border-t border-neutral-100">
 <p className="text-[9px] font-extrabold text-neutral-500 uppercase">Category</p>
 <p className="text-xs font-bold text-neutral-800 mt-0.5">{selectedExercise.category}</p>
 </div>
 </div>

 {/* Instructions */}
 {selectedExercise.instructions?.length > 0 && (
 <div className="space-y-2">
 <h4 className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider">Instructions</h4>
 <ol className="space-y-2">
 {selectedExercise.instructions.map((step, idx) => (
 <li key={idx} className="flex gap-3 text-xs text-neutral-700 leading-relaxed">
 <span className="font-mono font-bold text-danger bg-danger-light w-5 h-5 rounded-md border border-red-200 flex items-center justify-center shrink-0">{idx + 1}</span>
 <span>{step}</span>
 </li>
 ))}
 </ol>
 </div>
 )}

 {/* Safety Tips */}
 {selectedExercise.safetyTips?.length > 0 && (
 <div className="space-y-2 bg-warning-light border border-amber-200 p-4 rounded-2xl">
 <h4 className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider flex items-center gap-1">
 <ShieldAlert size={12} />
 <span>Safety Tips</span>
 </h4>
 <ul className="space-y-1.5">
 {selectedExercise.safetyTips.map((tip, idx) => (
 <li key={idx} className="text-xs text-amber-700 list-disc list-inside leading-relaxed">{tip}</li>
 ))}
 </ul>
 </div>
 )}
 </div>

 {/* Drawer Footer Actions */}
 <div className="pt-6 border-t border-neutral-100 mt-6 flex justify-end gap-3">
 {selectedExercise.source !== 'Custom' && (
 <button
 type="button"
 onClick={(e) => handleImportToOrg(selectedExercise.id, e)}
 disabled={isReceptionist}
 className="px-4 py-2.5 bg-danger hover:bg-red-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
 >
 <Download size={14} />
 <span>Import copy</span>
 </button>
 )}

 {canEdit(selectedExercise) && (
 <button
 type="button"
 onClick={(e) => handleOpenEdit(selectedExercise, e)}
 className="px-4 py-2.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-bold rounded-xl border border-neutral-200 transition flex items-center gap-1.5 cursor-pointer"
 >
 <Edit size={14} />
 <span>Edit Custom</span>
 </button>
 )}

 {canEdit(selectedExercise) && (
 <button
 type="button"
 onClick={(e) => handleDeleteExercise(selectedExercise.id, e)}
 className="px-3.5 py-2.5 bg-danger-light hover:bg-red-600 border border-red-200 text-danger rounded-xl transition cursor-pointer"
 >
 <Trash size={14} />
 </button>
 )}
 </div>
 </div>
 </div>
 )}

 {/* --- CUSTOM EXERCISE CREATION/EDIT MODAL --- */}
 {createModalOpen && (
 <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6">
 <form
 onSubmit={handleSubmitForm}
 className="w-full max-w-2xl bg-white border border-neutral-200 p-8 rounded-3xl space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]"
 >
 <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
 <div className="flex items-center gap-2">
 <Sparkles className="w-5 h-5 text-danger" />
 <h3 className="text-base font-black text-neutral-900">
 {isEditing ? 'Modify Custom Exercise' : 'Register Custom Exercise'}
 </h3>
 </div>
 <button
 type="button"
 onClick={() => setCreateModalOpen(false)}
 className="text-neutral-500 hover:text-neutral-700 cursor-pointer"
 >
 <X size={20} />
 </button>
 </div>

 <div className="space-y-4">
 {/* Row 1: Name & Category */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-xs text-neutral-600 font-semibold">Exercise Name *</label>
 <input
 type="text"
 required
 placeholder="e.g. Incline Bench Dumbbell Press"
 value={formName}
 onChange={e => setFormName(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 focus:border-neutral-200 rounded-xl px-4 py-3 text-xs text-neutral-900 focus:outline-none placeholder-neutral-400"
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-xs text-neutral-600 font-semibold">Category</label>
 <select
 value={formCategory}
 onChange={e => setFormCategory(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs text-neutral-700 focus:outline-none focus:border-neutral-200 cursor-pointer"
 >
 {['Strength', 'Cardio', 'Mobility', 'Flexibility', 'Functional', 'Olympic Lifting', 'Powerlifting', 'Bodybuilding', 'HIIT', 'Rehabilitation'].map(c => (
 <option key={c} value={c}>{c}</option>
 ))}
 </select>
 </div>
 </div>

 {/* Row 2: Muscle & Equipment */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="space-y-1.5">
 <label className="text-xs text-neutral-600 font-semibold">Primary Muscle</label>
 <select
 value={formPrimaryMuscle}
 onChange={e => setFormPrimaryMuscle(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs text-neutral-700 focus:outline-none focus:border-neutral-200 cursor-pointer"
 >
 {['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Core', 'Glutes', 'Quadriceps', 'Hamstrings', 'Calves', 'Full Body'].map(m => (
 <option key={m} value={m}>{m}</option>
 ))}
 </select>
 </div>
 <div className="space-y-1.5">
 <label className="text-xs text-neutral-600 font-semibold">Equipment</label>
 <select
 value={formEquipment}
 onChange={e => setFormEquipment(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs text-neutral-700 focus:outline-none focus:border-neutral-200 cursor-pointer"
 >
 {['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Smith Machine', 'Kettlebell', 'Resistance Band', 'Medicine Ball', 'Bodyweight', 'TRX', 'Other'].map(eq => (
 <option key={eq} value={eq}>{eq}</option>
 ))}
 </select>
 </div>
 <div className="space-y-1.5">
 <label className="text-xs text-neutral-600 font-semibold">Difficulty</label>
 <select
 value={formDifficulty}
 onChange={e => setFormDifficulty(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs text-neutral-700 focus:outline-none focus:border-neutral-200 cursor-pointer"
 >
 {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map(d => (
 <option key={d} value={d}>{d}</option>
 ))}
 </select>
 </div>
 </div>

 {/* Description */}
 <div className="space-y-1.5">
 <label className="text-xs text-neutral-600 font-semibold">Description</label>
 <textarea
 placeholder="Provide a brief explanation of what the exercise targets..."
 value={formDesc}
 onChange={e => setFormDesc(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 focus:border-neutral-200 rounded-xl px-4 py-3 text-xs text-neutral-900 focus:outline-none placeholder-neutral-400 h-20 resize-none"
 />
 </div>

 {/* Dynamic Instruction Steps */}
 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <label className="text-xs text-neutral-600 font-semibold">Instructions Steps</label>
 <button
 type="button"
 onClick={handleAddInstructionStep}
 className="text-[10px] text-danger hover:text-danger font-bold flex items-center gap-0.5 cursor-pointer"
 >
 <Plus size={12} /> Add Step
 </button>
 </div>
 <div className="space-y-2">
 {formInstructions.map((step, index) => (
 <div key={index} className="flex gap-2 items-center">
 <span className="font-mono text-xs font-bold text-neutral-500 w-4">{index + 1}.</span>
 <input
 type="text"
 placeholder={`Step ${index + 1} instructions...`}
 value={step}
 onChange={e => handleInstructionChange(e.target.value, index)}
 className="flex-1 bg-neutral-50 border border-neutral-200 focus:border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-900 focus:outline-none placeholder-neutral-400"
 />
 <button
 type="button"
 onClick={() => handleRemoveInstructionStep(index)}
 className="p-2 text-neutral-500 hover:text-danger cursor-pointer"
 >
 <Trash size={13} />
 </button>
 </div>
 ))}
 </div>
 </div>

 {/* Dynamic Safety Steps */}
 <div className="space-y-2 pt-2 border-t border-neutral-100">
 <div className="flex justify-between items-center">
 <label className="text-xs text-neutral-600 font-semibold">Safety Tips</label>
 <button
 type="button"
 onClick={handleAddSafetyStep}
 className="text-[10px] text-amber-700 hover:text-amber-700 font-bold flex items-center gap-0.5 cursor-pointer"
 >
 <Plus size={12} /> Add Tip
 </button>
 </div>
 <div className="space-y-2">
 {formSafety.map((tip, index) => (
 <div key={index} className="flex gap-2 items-center">
 <span className="font-mono text-xs font-bold text-neutral-500 w-4">*</span>
 <input
 type="text"
 placeholder="e.g. Keep spine neutral and brace core..."
 value={tip}
 onChange={e => handleSafetyChange(e.target.value, index)}
 className="flex-1 bg-neutral-50 border border-neutral-200 focus:border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-900 focus:outline-none placeholder-neutral-400"
 />
 <button
 type="button"
 onClick={() => handleRemoveSafetyStep(index)}
 className="p-2 text-neutral-500 hover:text-danger cursor-pointer"
 >
 <Trash size={13} />
 </button>
 </div>
 ))}
 </div>
 </div>

 {/* Row 4: Visibility & Notes */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-neutral-100">
 <div className="space-y-1.5">
 <label className="text-xs text-neutral-600 font-semibold">Visibility</label>
 <select
 value={formVisibility}
 onChange={e => setFormVisibility(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-xs text-neutral-700 focus:outline-none focus:border-neutral-200 cursor-pointer"
 >
 <option value="Private">Private (Org Only)</option>
 <option value="Public">Public (Community)</option>
 <option value="Unlisted">Unlisted</option>
 </select>
 </div>
 <div className="md:col-span-2 space-y-1.5">
 <label className="text-xs text-neutral-600 font-semibold">Trainer/Internal Notes</label>
 <input
 type="text"
 placeholder="Private guidance notes for training staff only..."
 value={formNotes}
 onChange={e => setFormNotes(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 focus:border-neutral-200 rounded-xl px-4 py-3 text-xs text-neutral-900 focus:outline-none placeholder-neutral-400"
 />
 </div>
 </div>
 </div>

 {/* Modal Actions */}
 <div className="pt-4 border-t border-neutral-100 flex justify-end gap-3">
 <button
 type="button"
 onClick={() => setCreateModalOpen(false)}
 className="px-4 py-2.5 bg-neutral-50 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold rounded-xl border border-neutral-200 cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={submitting}
 className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
 >
 {submitting && <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />}
 <span>{isEditing ? 'Apply Changes' : 'Create Custom'}</span>
 </button>
 </div>
 </form>
 </div>
 )}
 </div>
 );
}
