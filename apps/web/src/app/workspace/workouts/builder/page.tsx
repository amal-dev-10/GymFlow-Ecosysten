'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
 ArrowLeft, Save, Upload, Copy, Trash2, Plus, GripVertical, ChevronUp,
 ChevronDown, Settings2, ShieldAlert, ShieldCheck, Heart, Sparkles,
 Search, Dumbbell, Star, BookOpen, Clock, Activity, Target, Zap,
 Eye, RefreshCw, X, History, FileText, LayoutGrid, Check, Info
} from 'lucide-react';
import { exercisesApi, workoutsApi } from '../../../../lib/api';

// Structures
interface Exercise {
 id: string;
 name: string;
 category: string;
 primaryMuscle: string;
 secondaryMuscles: string[];
 equipment: string;
 difficulty: string;
 source: string;
 instructions: string[];
 safetyTips: string[];
}

interface WorkoutBlockConfig {
 sets: number;
 reps: number;
 weight: number;
 duration?: number;
 distance?: number;
 rest: number; // seconds
 tempo?: string;
 rpe?: number;
 notes?: string;
}

interface WorkoutBlock {
 id: string;
 exerciseId: string;
 name: string;
 primaryMuscle: string;
 source: string;
 isWarmup: boolean;
 isSuperset: boolean;
 supersetGroupId?: string;
 isDropset: boolean;
 config: WorkoutBlockConfig;
}

interface WorkoutSection {
 id: string;
 name: string;
 type: string; // Warm-Up, Main Workout, Accessory, Conditioning, Cooldown
 blocks: WorkoutBlock[];
}

interface VersionLog {
 id: string;
 versionNumber: number;
 name: string;
 notes?: string;
 createdAt: string;
}

export default function WorkoutBuilderPage() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const editId = searchParams.get('id');

 // Loaded libraries
 const [exercises, setExercises] = useState<Exercise[]>([]);
 const [exercisesLoading, setExercisesLoading] = useState(true);
 
 // Builder States
 const [workoutName, setWorkoutName] = useState('New Workout Session');
 const [workoutType, setWorkoutType] = useState('Strength');
 const [workoutDifficulty, setWorkoutDifficulty] = useState('Intermediate');
 const [workoutDuration, setWorkoutDuration] = useState(45);
 const [workoutCalories, setWorkoutCalories] = useState(300);
 const [workoutVisibility, setWorkoutVisibility] = useState('Organization');
 const [workoutStatus, setWorkoutStatus] = useState('Draft');
 
 const [workoutNotes, setWorkoutNotes] = useState('');
 const [prepNotes, setPrepNotes] = useState('');
 const [equipmentNotes, setEquipmentNotes] = useState('');
 const [memberNotes, setMemberNotes] = useState('');

 // Sections inside Workout
 const [sections, setSections] = useState<WorkoutSection[]>([
 { id: 'warmup', name: 'Warm-Up', type: 'Warm-Up', blocks: [] },
 { id: 'main', name: 'Main Lift & Intensity', type: 'Main Workout', blocks: [] },
 { id: 'cooldown', name: 'Cooldown & Stretches', type: 'Cooldown', blocks: [] }
 ]);

 // Sidebar search & filters
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedMuscle, setSelectedMuscle] = useState('all');
 const [selectedEquipment, setSelectedEquipment] = useState('all');
 const [selectedDifficulty, setSelectedDifficulty] = useState('all');

 // Preview & Version drawers
 const [isPreviewMode, setIsPreviewMode] = useState(false);
 const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);
 const [versions, setVersions] = useState<VersionLog[]>([]);
 const [restoringVersion, setRestoringVersion] = useState(false);

 // Config Modals
 const [activeConfigBlock, setActiveConfigBlock] = useState<{ sectionId: string; blockId: string } | null>(null);
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
 const [saving, setSaving] = useState(false);

 const showToast = (message: string, type: 'success' | 'error') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 // Load exercises list
 useEffect(() => {
 async function fetchExercises() {
 try {
 setExercisesLoading(true);
 const res = await exercisesApi.list({ limit: 100 });
 setExercises(res.items || []);
 } catch (_) {
 showToast('Failed to load exercises library.', 'error');
 } finally {
 setExercisesLoading(false);
 }
 }
 fetchExercises();
 }, []);

 // Fetch Workout for Editing
 useEffect(() => {
 if (!editId) return;
 const targetId = editId;
 async function loadWorkout() {
 try {
 const workout = await workoutsApi.get(targetId);
 setWorkoutName(workout.name);
 setWorkoutType(workout.type);
 setWorkoutDifficulty(workout.difficulty);
 setWorkoutDuration(workout.duration);
 setWorkoutCalories(workout.calories);
 setWorkoutVisibility(workout.visibility);
 setWorkoutStatus(workout.status);
 setWorkoutNotes(workout.notes || '');
 setPrepNotes(workout.prepNotes || '');
 setEquipmentNotes(workout.equipmentNotes || '');
 setMemberNotes(workout.memberNotes || '');
 
 if (workout.structure && Array.isArray(workout.structure)) {
 setSections(workout.structure);
 }

 // Fetch version history
 const logs = await workoutsApi.getVersions(targetId);
 setVersions(logs || []);
 } catch (_) {
 showToast('Failed to retrieve workout template.', 'error');
 }
 }
 loadWorkout();
 }, [editId]);

 // Filters
 const filteredExercises = useMemo(() => {
 return exercises.filter(ex => {
 const matchSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) || ex.primaryMuscle.toLowerCase().includes(searchQuery.toLowerCase());
 const matchMuscle = selectedMuscle === 'all' || ex.primaryMuscle === selectedMuscle;
 const matchEquip = selectedEquipment === 'all' || ex.equipment === selectedEquipment;
 const matchDiff = selectedDifficulty === 'all' || ex.difficulty === selectedDifficulty;
 return matchSearch && matchMuscle && matchEquip && matchDiff;
 });
 }, [exercises, searchQuery, selectedMuscle, selectedEquipment, selectedDifficulty]);

 // Add exercise to section
 const handleAddExercise = (exercise: Exercise, sectionId: string) => {
 const newBlock: WorkoutBlock = {
 id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 exerciseId: exercise.id,
 name: exercise.name,
 primaryMuscle: exercise.primaryMuscle,
 source: exercise.source,
 isWarmup: sectionId === 'warmup',
 isSuperset: false,
 isDropset: false,
 config: {
 sets: 3,
 reps: 10,
 weight: 0,
 rest: 60,
 tempo: '2-0-2-0',
 rpe: 7,
 notes: ''
 }
 };

 setSections(prev => prev.map(sec => {
 if (sec.id === sectionId) {
 return {
 ...sec,
 blocks: [...sec.blocks, newBlock]
 };
 }
 return sec;
 }));
 showToast(`Added"${exercise.name}" to ${sections.find(s => s.id === sectionId)?.name}`, 'success');
 };

 // Create new empty section
 const handleAddSection = () => {
 const name = prompt('Enter section name (e.g. Accessory Strength, Conditioning):');
 if (!name) return;
 const newSec: WorkoutSection = {
 id: `sec-${Date.now()}`,
 name,
 type: 'Accessory',
 blocks: []
 };
 setSections(prev => [...prev, newSec]);
 };

 // Modify block fields directly
 const handleUpdateBlockField = (sectionId: string, blockId: string, field: keyof WorkoutBlockConfig | 'isSuperset' | 'isDropset' | 'isWarmup', value: any) => {
 setSections(prev => prev.map(sec => {
 if (sec.id === sectionId) {
 return {
 ...sec,
 blocks: sec.blocks.map(block => {
 if (block.id === blockId) {
 if (field === 'isSuperset' || field === 'isDropset' || field === 'isWarmup') {
 return { ...block, [field]: value };
 } else {
 return {
 ...block,
 config: { ...block.config, [field]: value }
 };
 }
 }
 return block;
 })
 };
 }
 return sec;
 }));
 };

 // Remove block
 const handleRemoveBlock = (sectionId: string, blockId: string) => {
 setSections(prev => prev.map(sec => {
 if (sec.id === sectionId) {
 return {
 ...sec,
 blocks: sec.blocks.filter(b => b.id !== blockId)
 };
 }
 return sec;
 }));
 };

 // Duplicate block
 const handleDuplicateBlock = (sectionId: string, block: WorkoutBlock) => {
 const copy: WorkoutBlock = {
 ...block,
 id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 config: { ...block.config }
 };
 setSections(prev => prev.map(sec => {
 if (sec.id === sectionId) {
 const idx = sec.blocks.findIndex(b => b.id === block.id);
 const newBlocks = [...sec.blocks];
 newBlocks.splice(idx + 1, 0, copy);
 return {
 ...sec,
 blocks: newBlocks
 };
 }
 return sec;
 }));
 };

 // Move block up or down
 const handleMoveBlock = (sectionId: string, blockIndex: number, direction: 'up' | 'down') => {
 setSections(prev => prev.map(sec => {
 if (sec.id === sectionId) {
 const blocks = [...sec.blocks];
 if (direction === 'up' && blockIndex > 0) {
 const temp = blocks[blockIndex];
 blocks[blockIndex] = blocks[blockIndex - 1];
 blocks[blockIndex - 1] = temp;
 } else if (direction === 'down' && blockIndex < blocks.length - 1) {
 const temp = blocks[blockIndex];
 blocks[blockIndex] = blocks[blockIndex + 1];
 blocks[blockIndex + 1] = temp;
 }
 return { ...sec, blocks };
 }
 return sec;
 }));
 };

 // Calculate live Workout metrics
 const stats = useMemo(() => {
 let totalExercises = 0;
 let totalSets = 0;
 let totalReps = 0;
 let totalVolume = 0;
 let totalRestSeconds = 0;
 const muscles: Record<string, number> = {};
 const equipment = new Set<string>();

 sections.forEach(sec => {
 sec.blocks.forEach(b => {
 totalExercises++;
 totalSets += Number(b.config.sets) || 0;
 totalReps += (Number(b.config.sets) || 0) * (Number(b.config.reps) || 0);
 totalVolume += (Number(b.config.sets) || 0) * (Number(b.config.reps) || 0) * (Number(b.config.weight) || 0);
 totalRestSeconds += (Number(b.config.sets) || 0) * (Number(b.config.rest) || 0);
 
 if (b.primaryMuscle) {
 muscles[b.primaryMuscle] = (muscles[b.primaryMuscle] || 0) + (Number(b.config.sets) || 0);
 }

 // Match equipment lookup
 const exDetail = exercises.find(e => e.id === b.exerciseId);
 if (exDetail && exDetail.equipment) {
 equipment.add(exDetail.equipment);
 }
 });
 });

 return {
 totalExercises,
 totalSets,
 totalReps,
 totalVolume,
 restTimeMinutes: Math.round(totalRestSeconds / 60),
 musclesList: Object.entries(muscles).map(([name, weight]) => ({ name, weight })),
 equipmentCount: equipment.size
 };
 }, [sections, exercises]);

 // Live validation warnings
 const validationWarnings = useMemo(() => {
 const warnings: string[] = [];
 let hasWarmup = false;
 let hasRestZero = false;
 let pushCount = 0;
 let pullCount = 0;
 const duplicates = new Set<string>();
 const seenNames = new Set<string>();

 sections.forEach(sec => {
 if (sec.type === 'Warm-Up' && sec.blocks.length > 0) {
 hasWarmup = true;
 }
 
 sec.blocks.forEach(b => {
 if (b.config.rest <= 0) {
 hasRestZero = true;
 }

 if (seenNames.has(b.name)) {
 duplicates.add(b.name);
 }
 seenNames.add(b.name);

 const lowerName = b.name.toLowerCase();
 if (lowerName.includes('press') || lowerName.includes('push') || lowerName.includes('extension')) {
 pushCount++;
 }
 if (lowerName.includes('row') || lowerName.includes('pull') || lowerName.includes('curl')) {
 pullCount++;
 }
 });
 });

 if (!hasWarmup) {
 warnings.push('Missing Warm-up: Consider adding at least 1 warm-up exercise at the beginning.');
 }
 if (hasRestZero) {
 warnings.push('Missing Rest: Some exercises have 0s rest. Give members recovery intervals.');
 }
 if (duplicates.size > 0) {
 warnings.push(`Duplicate Exercises:"${Array.from(duplicates).join(', ')}" added multiple times.`);
 }
 if (stats.totalExercises > 10) {
 warnings.push('Long Workout: Having more than 10 exercises might lead to fatigue or run over 90 mins.');
 }
 if (pushCount > 3 && pullCount === 0) {
 warnings.push('Unbalanced Load: High ratio of push movements vs pull. Add pull exercises for posture balance.');
 }

 return warnings;
 }, [sections, stats.totalExercises]);

 // Save Workout Template Draft
 const handleSaveWorkout = async () => {
 const payload = {
 name: workoutName,
 type: workoutType,
 difficulty: workoutDifficulty,
 duration: Number(workoutDuration),
 calories: Number(workoutCalories),
 visibility: workoutVisibility,
 status: workoutStatus,
 isTemplate: true,
 notes: workoutNotes,
 prepNotes,
 equipmentNotes,
 memberNotes,
 structure: sections,
 };

 try {
 setSaving(true);
 if (editId) {
 await workoutsApi.update(editId, payload);
 showToast('Workout template updated successfully!', 'success');
 } else {
 await workoutsApi.create(payload);
 showToast('New workout template created!', 'success');
 router.push('/workspace/workouts');
 }
 } catch (_) {
 showToast('Failed to save workout template.', 'error');
 } finally {
 setSaving(false);
 }
 };

 // Restore version backup
 const handleRestoreVersion = async (versionId: string) => {
 if (!editId) return;
 try {
 setRestoringVersion(true);
 const restored = await workoutsApi.restoreVersion(editId, versionId);
 if (restored.structure && Array.isArray(restored.structure)) {
 setSections(restored.structure);
 }
 setVersionDrawerOpen(false);
 showToast(`Restored to Version ${restored.version}`, 'success');
 
 // Reload history logs
 const logs = await workoutsApi.getVersions(editId);
 setVersions(logs || []);
 } catch (_) {
 showToast('Restore version failed.', 'error');
 } finally {
 setRestoringVersion(false);
 }
 };

 return (
 <div className="min-h-screen bg-white text-neutral-900 flex flex-col relative overflow-hidden">
 
 {/* Toast Popup */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold shadow-2xl transition-all ${
 toast.type === 'success' ? 'bg-success-light text-success border-green-200' : 'bg-danger-light text-danger border-red-200'
 }`}>
 {toast.type === 'success' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
 {toast.message}
 </div>
 )}

 {/* Header bar */}
 <div className="h-16 px-6 bg-neutral-50/60 border-b border-neutral-100 flex items-center justify-between gap-4 relative z-10 shrink-0">
 <div className="flex items-center gap-4">
 <button
 type="button"
 onClick={() => router.push('/workspace/workouts')}
 className="p-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 rounded-xl hover:text-neutral-900 transition cursor-pointer"
 >
 <ArrowLeft size={14} />
 </button>
 
 <div className="flex items-center gap-3">
 <input
 type="text"
 value={workoutName}
 onChange={e => setWorkoutName(e.target.value)}
 className="bg-transparent text-sm font-extrabold text-neutral-900 border-b border-transparent hover:border-neutral-200 focus:border-red-200 focus:outline-none py-0.5 max-w-[240px] truncate"
 />
 <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-50 border border-neutral-200 text-neutral-600 capitalize">
 {workoutStatus}
 </span>
 </div>
 </div>

 {/* Action controllers */}
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => setIsPreviewMode(!isPreviewMode)}
 className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition cursor-pointer"
 >
 <Eye size={13} />
 <span>{isPreviewMode ? 'Exit Preview' : 'Preview Mode'}</span>
 </button>

 {editId && (
 <button
 type="button"
 onClick={() => setVersionDrawerOpen(true)}
 className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition cursor-pointer"
 >
 <History size={13} />
 <span>History</span>
 </button>
 )}

 <select
 value={workoutStatus}
 onChange={e => setWorkoutStatus(e.target.value)}
 className="bg-neutral-50 border border-neutral-100 rounded-xl px-2.5 py-2 text-xs text-neutral-600 focus:outline-none focus:border-neutral-200 cursor-pointer"
 >
 <option value="Draft">Save as Draft</option>
 <option value="Published">Publish Template</option>
 </select>

 <button
 type="button"
 onClick={handleSaveWorkout}
 disabled={saving}
 className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition shadow-lg cursor-pointer disabled:opacity-40"
 >
 {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save size={13} />}
 <span>Save Template</span>
 </button>
 </div>
 </div>

 {/* THREE PANEL AREA */}
 <div className="flex-1 flex overflow-hidden relative z-10">

 {/* LEFT COLUMN: EXERCISE LIBRARY SIDEBAR */}
 {!isPreviewMode && (
 <div className="w-80 bg-neutral-50/20 border-r border-neutral-100/60 p-4 flex flex-col gap-3 shrink-0">
 <p className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">Exercise Library</p>
 
 {/* Instant Search input */}
 <div className="relative">
 <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-500" />
 <input
 type="text"
 placeholder="Search catalog..."
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl pl-8.5 pr-3 py-2 text-xs text-neutral-800 placeholder-neutral-400 outline-none"
 />
 </div>

 {/* Filters */}
 <div className="grid grid-cols-2 gap-1.5">
 <select
 value={selectedMuscle}
 onChange={e => setSelectedMuscle(e.target.value)}
 className="bg-neutral-50 border border-neutral-100 rounded-lg p-1.5 text-[10px] text-neutral-600 focus:outline-none"
 >
 <option value="all">All Muscles</option>
 <option value="Chest">Chest</option>
 <option value="Back">Back</option>
 <option value="Shoulders">Shoulders</option>
 <option value="Legs">Legs</option>
 <option value="Core">Core</option>
 </select>
 <select
 value={selectedEquipment}
 onChange={e => setSelectedEquipment(e.target.value)}
 className="bg-neutral-50 border border-neutral-100 rounded-lg p-1.5 text-[10px] text-neutral-600 focus:outline-none"
 >
 <option value="all">Equipment</option>
 <option value="Bodyweight">Bodyweight</option>
 <option value="Barbell">Barbell</option>
 <option value="Dumbbell">Dumbbell</option>
 <option value="Cable Machine">Cables</option>
 </select>
 </div>

 {/* List */}
 <div className="flex-1 overflow-y-auto space-y-2 pr-1">
 {exercisesLoading ? (
 <div className="text-center py-12 text-xs text-neutral-400">Loading exercises...</div>
 ) : filteredExercises.length === 0 ? (
 <div className="text-center py-12 text-xs text-neutral-400">No exercises match filters.</div>
 ) : (
 filteredExercises.map(ex => (
 <div key={ex.id} className="bg-neutral-50/40 border border-neutral-200 hover:border-neutral-200 p-3 rounded-xl flex items-center justify-between gap-3 group transition">
 <div className="space-y-0.5">
 <p className="text-xs font-bold text-neutral-800 group-hover:text-neutral-900 transition">{ex.name}</p>
 <div className="flex items-center gap-1.5 text-[9px] text-neutral-500 font-semibold uppercase tracking-wider">
 <span>{ex.primaryMuscle}</span>
 <span>•</span>
 <span>{ex.equipment}</span>
 </div>
 </div>
 
 {/* Add triggers */}
 <div className="flex items-center gap-1">
 <button
 type="button"
 onClick={() => handleAddExercise(ex, 'main')}
 className="w-6 h-6 rounded-lg bg-neutral-50 border border-neutral-200 hover:bg-red-600 hover:border-red-200 hover:text-white flex items-center justify-center text-neutral-600 text-xs transition cursor-pointer"
 title="Add to Main Workout"
 >
 +
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 )}

 {/* CENTER PANEL: WORKOUT BUILDER CANVAS */}
 <div className="flex-1 p-6 overflow-y-auto space-y-6 flex flex-col bg-white">
 
 {/* General Metadata Inputs row */}
 {!isPreviewMode && (
 <div className="bg-white border border-neutral-200 p-5 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-4">
 <div>
 <label className="text-[10px] text-neutral-500 font-extrabold uppercase block mb-1">Workout Type</label>
 <select
 value={workoutType}
 onChange={e => setWorkoutType(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none"
 >
 <option value="Strength">Strength Training</option>
 <option value="HIIT">HIIT Cardio</option>
 <option value="Tabata">Tabata Intervals</option>
 <option value="Cardio">Endurance Cardio</option>
 <option value="Mobility">Mobility & Flex</option>
 </select>
 </div>

 <div>
 <label className="text-[10px] text-neutral-500 font-extrabold uppercase block mb-1">Difficulty</label>
 <select
 value={workoutDifficulty}
 onChange={e => setWorkoutDifficulty(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none"
 >
 <option value="Beginner">Beginner</option>
 <option value="Intermediate">Intermediate</option>
 <option value="Advanced">Advanced</option>
 <option value="Elite">Elite Athlete</option>
 </select>
 </div>

 <div>
 <label className="text-[10px] text-neutral-500 font-extrabold uppercase block mb-1">Duration (Mins)</label>
 <input
 type="number"
 value={workoutDuration}
 onChange={e => setWorkoutDuration(Number(e.target.value))}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none"
 />
 </div>

 <div>
 <label className="text-[10px] text-neutral-500 font-extrabold uppercase block mb-1">Est. Calories</label>
 <input
 type="number"
 value={workoutCalories}
 onChange={e => setWorkoutCalories(Number(e.target.value))}
 className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none"
 />
 </div>
 </div>
 )}

 {/* Builder Canvas lists */}
 {sections.map(sec => (
 <div key={sec.id} className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
 <div className="flex justify-between items-center border-b border-neutral-100 pb-2.5">
 <div className="flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full bg-danger shrink-0" />
 <h3 className="text-xs font-bold text-neutral-800">{sec.name}</h3>
 <span className="text-[10px] font-mono text-neutral-500 font-bold bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200">
 {sec.blocks.length} blocks
 </span>
 </div>
 {!isPreviewMode && (
 <span className="text-[10px] text-neutral-400 uppercase tracking-wide font-extrabold">Section</span>
 )}
 </div>

 {/* Block List */}
 {sec.blocks.length === 0 ? (
 <div className="py-8 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-xl bg-neutral-50/20">
 No exercises added. Drag or click"+" from the library sidebar to add elements.
 </div>
 ) : (
 <div className="space-y-3">
 {sec.blocks.map((block, idx) => {
 const isGroupedSuperset = block.isSuperset && sec.blocks[idx + 1]?.isSuperset;
 
 return (
 <div
 key={block.id}
 className={`bg-neutral-50/70 border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
 block.isSuperset
 ? 'border-purple-650/40 bg-purple-950/5'
 : 'border-neutral-200'
 }`}
 >
 {/* Drag indicator & Details */}
 <div className="flex items-start gap-3">
 {!isPreviewMode && (
 <div className="flex flex-col gap-1 mt-1 cursor-grab active:cursor-grabbing text-neutral-400">
 <GripVertical size={14} />
 </div>
 )}

 <div className="space-y-1">
 <div className="flex items-center gap-2">
 {block.isSuperset && (
 <span className="text-[9px] font-black bg-purple-950 border border-purple-800 text-purple-400 px-2 py-0.5 rounded-md uppercase tracking-wider">
 Superset
 </span>
 )}
 {block.isDropset && (
 <span className="text-[9px] font-black bg-primary-light border border-primary/20 text-primary px-2 py-0.5 rounded-md uppercase tracking-wider">
 Dropset
 </span>
 )}
 <p className="text-xs font-bold text-neutral-900">{block.name}</p>
 </div>
 <div className="flex items-center gap-1.5 text-[9px] text-neutral-500 font-semibold tracking-wider uppercase">
 <span>Target: {block.primaryMuscle}</span>
 <span>•</span>
 <span>Source: {block.source}</span>
 </div>
 </div>
 </div>

 {/* Configuration inputs */}
 <div className="grid grid-cols-4 md:flex md:items-center gap-2.5 max-w-lg flex-1">
 <div className="space-y-1">
 <label className="text-[9px] text-neutral-500 font-bold block">Sets</label>
 <input
 type="number"
 disabled={isPreviewMode}
 value={block.config.sets}
 onChange={e => handleUpdateBlockField(sec.id, block.id, 'sets', Number(e.target.value))}
 className="w-14 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 focus:border-red-200 text-center rounded-lg py-1.5 text-xs text-neutral-900 outline-none"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] text-neutral-500 font-bold block">Reps</label>
 <input
 type="number"
 disabled={isPreviewMode}
 value={block.config.reps}
 onChange={e => handleUpdateBlockField(sec.id, block.id, 'reps', Number(e.target.value))}
 className="w-14 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 focus:border-red-200 text-center rounded-lg py-1.5 text-xs text-neutral-900 outline-none"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] text-neutral-500 font-bold block">Weight (lbs)</label>
 <input
 type="number"
 disabled={isPreviewMode}
 value={block.config.weight}
 onChange={e => handleUpdateBlockField(sec.id, block.id, 'weight', Number(e.target.value))}
 className="w-16 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 focus:border-red-200 text-center rounded-lg py-1.5 text-xs text-neutral-900 outline-none"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[9px] text-neutral-500 font-bold block">Rest (s)</label>
 <input
 type="number"
 disabled={isPreviewMode}
 value={block.config.rest}
 onChange={e => handleUpdateBlockField(sec.id, block.id, 'rest', Number(e.target.value))}
 className="w-16 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 focus:border-red-200 text-center rounded-lg py-1.5 text-xs text-neutral-900 outline-none"
 />
 </div>
 </div>

 {/* Block actions */}
 {!isPreviewMode && (
 <div className="flex items-center gap-1.5 justify-end">
 <button
 type="button"
 onClick={() => handleUpdateBlockField(sec.id, block.id, 'isSuperset', !block.isSuperset)}
 className={`p-1.5 border rounded-lg transition cursor-pointer text-[10px] font-bold ${
 block.isSuperset ? 'bg-purple-950 border-purple-800 text-purple-400' : 'bg-neutral-50 border-neutral-200 text-neutral-500 hover:text-neutral-700'
 }`}
 title="Toggle Superset link"
 >
 SS
 </button>

 <button
 type="button"
 onClick={() => handleUpdateBlockField(sec.id, block.id, 'isDropset', !block.isDropset)}
 className={`p-1.5 border rounded-lg transition cursor-pointer text-[10px] font-bold ${
 block.isDropset ? 'bg-primary-light border-primary/20 text-primary' : 'bg-neutral-50 border-neutral-200 text-neutral-500 hover:text-neutral-700'
 }`}
 title="Toggle Dropset linkage"
 >
 DS
 </button>

 <div className="flex flex-col">
 <button
 type="button"
 disabled={idx === 0}
 onClick={() => handleMoveBlock(sec.id, idx, 'up')}
 className="text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer disabled:opacity-30"
 >
 <ChevronUp size={11} />
 </button>
 <button
 type="button"
 disabled={idx === sec.blocks.length - 1}
 onClick={() => handleMoveBlock(sec.id, idx, 'down')}
 className="text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer disabled:opacity-30"
 >
 <ChevronDown size={11} />
 </button>
 </div>

 <button
 type="button"
 onClick={() => handleDuplicateBlock(sec.id, block)}
 className="text-neutral-500 hover:text-neutral-700 p-1.5 cursor-pointer"
 title="Duplicate Block"
 >
 <Copy size={11} />
 </button>

 <button
 type="button"
 onClick={() => handleRemoveBlock(sec.id, block.id)}
 className="text-danger hover:text-danger p-1.5 cursor-pointer"
 title="Remove Block"
 >
 <Trash2 size={11} />
 </button>
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>
 ))}

 {/* Add custom workout section */}
 {!isPreviewMode && (
 <button
 type="button"
 onClick={handleAddSection}
 className="py-3.5 border border-dashed border-neutral-200 hover:border-neutral-200 bg-neutral-50/10 hover:bg-neutral-50/20 text-neutral-600 hover:text-neutral-700 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer"
 >
 <Plus size={14} />
 <span>Create Custom Workout Section</span>
 </button>
 )}

 {/* Additional text notes */}
 {!isPreviewMode && (
 <div className="bg-white border border-neutral-200 p-5 rounded-2xl space-y-4">
 <h3 className="text-xs font-bold text-neutral-700">Workout Notes & Description</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-500 font-extrabold uppercase">Trainer Notes (Internal)</label>
 <textarea
 value={workoutNotes}
 onChange={e => setWorkoutNotes(e.target.value)}
 placeholder="E.g. Focus on control on eccentric parts. Do not rush."
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 h-20 resize-none"
 />
 </div>

 <div className="space-y-1">
 <label className="text-[10px] text-neutral-500 font-extrabold uppercase">Preparation Guidelines</label>
 <textarea
 value={prepNotes}
 onChange={e => setPrepNotes(e.target.value)}
 placeholder="Dynamic routines before starting, resistance band activation."
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 h-20 resize-none"
 />
 </div>
 </div>
 </div>
 )}
 </div>

 {/* RIGHT COLUMN: WORKOUT STATS SUMMARY & MUSCLE TARGET VISUALIZATION */}
 <div className="w-80 bg-neutral-50/20 border-l border-neutral-100/60 p-5 space-y-5 overflow-y-auto shrink-0 flex flex-col">
 <div>
 <p className="text-[10px] font-black uppercase text-neutral-500 tracking-wider mb-3">Live Volume Summary</p>
 <div className="grid grid-cols-2 gap-3">
 <div className="bg-neutral-50/40 border border-neutral-200/60 p-3 rounded-xl">
 <span className="text-[9px] text-neutral-500 font-extrabold block">Exercises</span>
 <span className="text-base font-bold text-neutral-800 font-mono">{stats.totalExercises}</span>
 </div>
 <div className="bg-neutral-50/40 border border-neutral-200/60 p-3 rounded-xl">
 <span className="text-[9px] text-neutral-500 font-extrabold block">Total Sets</span>
 <span className="text-base font-bold text-neutral-800 font-mono">{stats.totalSets}</span>
 </div>
 <div className="bg-neutral-50/40 border border-neutral-200/60 p-3 rounded-xl col-span-2">
 <span className="text-[9px] text-neutral-500 font-extrabold block">Est. Volume Load</span>
 <span className="text-base font-bold text-danger font-mono">{stats.totalVolume.toLocaleString()} lbs</span>
 </div>
 </div>
 </div>

 {/* Muscle distribution visualizer */}
 <div className="space-y-3">
 <div className="flex justify-between items-center">
 <p className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">Muscle Workload</p>
 <span className="text-[9px] text-neutral-500">Sets share</span>
 </div>

 {stats.musclesList.length === 0 ? (
 <div className="py-6 text-center text-xs text-neutral-400 italic">
 Add exercises to build workload.
 </div>
 ) : (
 <div className="space-y-2 bg-white border border-neutral-200 rounded-xl p-3">
 {stats.musclesList.map(m => (
 <div key={m.name}>
 <div className="flex justify-between text-[10px] text-neutral-600 mb-1">
 <span>{m.name}</span>
 <span className="font-bold text-neutral-700 font-mono">{m.weight} sets</span>
 </div>
 <div className="h-1.5 bg-neutral-50 rounded-full overflow-hidden">
 <div className="h-full bg-danger rounded-full" style={{ width: `${(m.weight / stats.totalSets) * 100}%` }} />
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Validation Warnings list */}
 <div className="flex-1 flex flex-col justify-end">
 <p className="text-[10px] font-black uppercase text-neutral-500 tracking-wider mb-2.5">Live Workout Validator</p>
 {validationWarnings.length === 0 ? (
 <div className="p-3.5 rounded-xl border border-green-200 bg-success-light text-success text-xs font-semibold flex items-center gap-2">
 <ShieldCheck className="w-4 h-4 text-success shrink-0" />
 <span>Validation Clean: Workout balanced!</span>
 </div>
 ) : (
 <div className="bg-danger-light border border-red-200 p-3.5 rounded-xl space-y-2">
 <div className="flex items-center gap-1.5 text-danger text-[11px] font-bold">
 <ShieldAlert size={13} />
 <span>Validation Alerts ({validationWarnings.length})</span>
 </div>
 <ul className="list-disc list-inside text-[10px] text-danger leading-relaxed pl-1 space-y-1.5">
 {validationWarnings.map((warn, i) => (
 <li key={i}>{warn}</li>
 ))}
 </ul>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* --- VERSION HISTORY SLIDE-OVER DRAWER --- */}
 {versionDrawerOpen && (
 <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex justify-end">
 <div className="w-80 bg-white border-l border-neutral-200 h-full p-5 flex flex-col space-y-4 shadow-2xl relative animate-slide-in">
 <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
 <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
 <History className="w-4 h-4 text-danger" />
 <span>Revision Backups</span>
 </h3>
 <button
 type="button"
 onClick={() => setVersionDrawerOpen(false)}
 className="text-neutral-500 hover:text-neutral-700 cursor-pointer"
 >
 <X size={18} />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto space-y-3">
 {versions.length === 0 ? (
 <div className="text-center py-16 text-xs text-neutral-400">No revisions logged yet.</div>
 ) : (
 versions.map((ver, idx) => (
 <div key={ver.id} className="bg-neutral-50/50 border border-neutral-100 hover:border-neutral-200 p-3.5 rounded-xl space-y-2 transition">
 <div className="flex justify-between items-center">
 <span className="text-xs font-bold text-neutral-800">Revision #{ver.versionNumber}</span>
 <span className="text-[9px] font-mono text-neutral-500">{new Date(ver.createdAt).toLocaleTimeString()}</span>
 </div>
 <p className="text-[10px] text-neutral-600">{ver.notes || 'Auto-saved session modifications.'}</p>
 
 <button
 type="button"
 disabled={restoringVersion}
 onClick={() => handleRestoreVersion(ver.id)}
 className="w-full text-center py-1 text-[10px] font-bold bg-neutral-50 hover:bg-danger-light text-neutral-700 hover:text-danger border border-neutral-200 hover:border-red-200 rounded-lg cursor-pointer transition disabled:opacity-50"
 >
 {restoringVersion ? 'Restoring...' : 'Restore Revision'}
 </button>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
