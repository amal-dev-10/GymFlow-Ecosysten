'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
 Search, Plus, Download, Upload, RefreshCw, Trash2, Edit2, Archive,
 RotateCcw, GitMerge, ShieldAlert, Sparkles, Dumbbell, ShieldCheck,
 Check, X, Activity, BookOpen, Clock, Target, Sliders, List, Grid,
 BarChart3, History, ArrowLeft, ArrowRight, Tag, HelpCircle
} from 'lucide-react';
import { metadataApi } from '../../../../lib/api';

interface MetadataItem {
 id: string;
 organizationId?: string;
 type: string;
 name: string;
 description?: string;
 icon?: string;
 image?: string;
 color?: string;
 status: string;
 isSystem: boolean;
 usageCount: number;
 createdAt: string;
 updatedAt: string;
}

export default function MetadataManagementPage() {
 const router = useRouter();

 // Active section tabs
 const sections = [
 { id: 'Category', label: 'Exercise Categories', icon: List },
 { id: 'Muscle', label: 'Muscle Groups', icon: Target },
 { id: 'Equipment', label: 'Equipment Types', icon: Dumbbell },
 { id: 'ExerciseType', label: 'Exercise Types', icon: Sliders },
 { id: 'Difficulty', label: 'Difficulty Levels', icon: Sparkles },
 { id: 'MovementPattern', label: 'Movement Patterns', icon: Activity },
 { id: 'BodyRegion', label: 'Body Regions', icon: BookOpen },
 { id: 'Tag', label: 'Custom Tags', icon: Tag },
 { id: 'audit', label: 'Audit History', icon: History },
 { id: 'analytics', label: 'Taxonomy Stats', icon: BarChart3 }
 ];

 const [activeSection, setActiveSection] = useState('Category');

 // Loading & Data states
 const [loading, setLoading] = useState(true);
 const [items, setItems] = useState<MetadataItem[]>([]);
 const [totalItems, setTotalItems] = useState(0);
 const [currentPage, setCurrentPage] = useState(1);
 const [totalPages, setTotalPages] = useState(1);
 const [analytics, setAnalytics] = useState<any>(null);

 // Search & Filters
 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState('Active'); // Active, Archived, all
 const [sourceFilter, setSourceFilter] = useState('all'); // system, custom, all

 // Modals & Panels
 const [modalOpen, setModalOpen] = useState(false);
 const [isEditing, setIsEditing] = useState(false);
 const [editId, setEditId] = useState<string | null>(null);
 const [submitting, setSubmitting] = useState(false);

 // Merge Category Panel
 const [mergeOpen, setMergeOpen] = useState(false);
 const [mergeSourceId, setMergeSourceId] = useState('');
 const [mergeTargetId, setMergeTargetId] = useState('');
 const [merging, setMerging] = useState(false);

 // Import Drawer
 const [importOpen, setImportOpen] = useState(false);
 const [importText, setImportText] = useState('');
 const [importing, setImporting] = useState(false);

 // Create Form Fields
 const [formName, setFormName] = useState('');
 const [formDesc, setFormDesc] = useState('');
 const [formIcon, setFormIcon] = useState('Dumbbell');
 const [formColor, setFormColor] = useState('blue');
 const [formStatus, setFormStatus] = useState('Active');
 
 // Duplicate check warnings
 const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
 const [duplicateSuggestions, setDuplicateSuggestions] = useState<string[]>([]);
 const [exactDuplicateFound, setExactDuplicateFound] = useState(false);

 // User details
 const [userRole, setUserRole] = useState('trainer');
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 // Retrieve user role
 useEffect(() => {
 if (typeof window !== 'undefined') {
 const userStr = localStorage.getItem('user');
 if (userStr) {
 try {
 const userObj = JSON.parse(userStr);
 setUserRole(userObj.role || 'trainer');
 } catch (_) {}
 }
 }
 }, []);

 const showToast = (message: string, type: 'success' | 'error') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 4000);
 };

 // Fetch Taxonomy items & Stats
 const loadData = useCallback(async () => {
 try {
 setLoading(true);
 
 if (activeSection === 'audit' || activeSection === 'analytics') {
 const stats = await metadataApi.getAnalytics();
 setAnalytics(stats);
 } else {
 const res = await metadataApi.list({
 type: activeSection,
 search: searchQuery || undefined,
 status: statusFilter || undefined,
 source: sourceFilter || undefined,
 page: currentPage,
 limit: 15,
 });
 setItems(res.items || []);
 setTotalItems(res.total || 0);
 setTotalPages(res.totalPages || 1);
 }
 } catch (err) {
 showToast('Failed to load metadata taxonomy catalog.', 'error');
 } finally {
 setLoading(false);
 }
 }, [activeSection, searchQuery, statusFilter, sourceFilter, currentPage]);

 useEffect(() => {
 loadData();
 // Reset page on section swap
 setCurrentPage(1);
 setSelectedIds([]);
 }, [activeSection, loadData]);

 // Bulk actions selection
 const [selectedIds, setSelectedIds] = useState<string[]>([]);

 // Duplicate Check keypress/input handler
 const handleNameChange = async (name: string) => {
 setFormName(name);
 if (!name.trim()) {
 setDuplicateWarning(null);
 setDuplicateSuggestions([]);
 setExactDuplicateFound(false);
 return;
 }

 try {
 // Simple frontend-side checking against current list
 const clean = name.toLowerCase().trim();
 const suggestions: string[] = [];
 let exact = false;

 // Also pull a quick local lookup from all loaded items to prevent crashes
 const allLoaded = await metadataApi.list({ type: activeSection, limit: 100 });
 
 allLoaded.items?.forEach((item: any) => {
 if (item.name.toLowerCase() === clean) {
 exact = true;
 }
 
 // Similar substring matches
 if ((item.name.toLowerCase().includes(clean) || clean.includes(item.name.toLowerCase())) && item.name.toLowerCase() !== clean) {
 suggestions.push(item.name);
 }
 });

 setExactDuplicateFound(exact);
 if (exact) {
 setDuplicateWarning(`Warning: Exact match"${name}" already exists and duplicates are blocked.`);
 setDuplicateSuggestions([]);
 } else if (suggestions.length > 0) {
 setDuplicateWarning(`Did you mean to use an existing category: ${suggestions.join(', ')}?`);
 setDuplicateSuggestions(suggestions);
 } else {
 setDuplicateWarning(null);
 setDuplicateSuggestions([]);
 }
 } catch (_) {}
 };

 // Submit create/update form
 const handleSubmitForm = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!formName.trim()) {
 showToast('Name is required.', 'error');
 return;
 }

 if (exactDuplicateFound && !isEditing) {
 showToast('Duplicate name blocked.', 'error');
 return;
 }

 const payload = {
 type: activeSection,
 name: formName,
 description: formDesc || undefined,
 icon: formIcon,
 color: formColor,
 status: formStatus,
 };

 try {
 setSubmitting(true);
 if (isEditing && editId) {
 await metadataApi.update(editId, payload);
 showToast('Taxonomy item updated successfully.', 'success');
 } else {
 await metadataApi.create(payload);
 showToast('Custom taxonomy item created.', 'success');
 }
 setModalOpen(false);
 loadData();
 } catch (err) {
 showToast('Failed to save taxonomy item.', 'error');
 } finally {
 setSubmitting(false);
 }
 };

 // Archive / Restore
 const handleToggleArchive = async (item: MetadataItem) => {
 const newStatus = item.status === 'Active' ? 'Archived' : 'Active';
 try {
 await metadataApi.update(item.id, { status: newStatus });
 showToast(`Item successfully ${newStatus === 'Active' ? 'restored' : 'archived'}.`, 'success');
 loadData();
 } catch (err) {
 showToast('Failed to alter status.', 'error');
 }
 };

 // Soft Delete
 const handleDeleteItem = async (id: string) => {
 if (!confirm('Are you sure you want to delete this custom metadata category? It will be archived.')) return;
 try {
 await metadataApi.delete(id);
 showToast('Metadata item deleted and archived.', 'success');
 loadData();
 } catch (err) {
 showToast('Failed to delete item.', 'error');
 }
 };

 // Merge execution
 const handleExecuteMerge = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!mergeSourceId || !mergeTargetId) {
 showToast('Please select both source and target items.', 'error');
 return;
 }
 if (mergeSourceId === mergeTargetId) {
 showToast('Source and target items must be different.', 'error');
 return;
 }

 try {
 setMerging(true);
 const res = await metadataApi.merge({
 sourceId: mergeSourceId,
 targetId: mergeTargetId,
 });
 showToast(`Merge complete! Updated ${res.updatedExercisesCount} exercises.`, 'success');
 setMergeOpen(false);
 setMergeSourceId('');
 setMergeTargetId('');
 loadData();
 } catch (err) {
 showToast('Failed to complete merge operation.', 'error');
 } finally {
 setMerging(false);
 }
 };

 // Export metadata to JSON
 const handleExportData = () => {
 try {
 const dataStr ="data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
 const downloadAnchor = document.createElement('a');
 downloadAnchor.setAttribute("href", dataStr);
 downloadAnchor.setAttribute("download", `gymflow_metadata_${activeSection.toLowerCase()}.json`);
 document.body.appendChild(downloadAnchor);
 downloadAnchor.click();
 downloadAnchor.remove();
 showToast('Data exported successfully.', 'success');
 } catch (err) {
 showToast('Export failed.', 'error');
 }
 };

 // Bulk Import
 const handleImportSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!importText.trim()) return;

 try {
 setImporting(true);
 const parsed = JSON.parse(importText);
 const itemsArray = Array.isArray(parsed) ? parsed : [parsed];
 
 const cleanItems = itemsArray.map(item => ({
 type: activeSection,
 name: item.name,
 description: item.description,
 icon: item.icon,
 color: item.color,
 status: item.status || 'Active'
 }));

 const res = await metadataApi.import({ items: cleanItems });
 showToast(`Imported ${res.count} items successfully!`, 'success');
 setImportOpen(false);
 setImportText('');
 loadData();
 } catch (err) {
 showToast('Invalid JSON syntax or import failed.', 'error');
 } finally {
 setImporting(false);
 }
 };

 // Open Edit Dialog
 const handleOpenEdit = (item: MetadataItem) => {
 setIsEditing(true);
 setEditId(item.id);
 setFormName(item.name);
 setFormDesc(item.description || '');
 setFormIcon(item.icon || 'Dumbbell');
 setFormColor(item.color || 'blue');
 setFormStatus(item.status);
 setDuplicateWarning(null);
 setDuplicateSuggestions([]);
 setExactDuplicateFound(false);
 setModalOpen(true);
 };

 // Open Create Dialog
 const handleOpenCreate = () => {
 setIsEditing(false);
 setEditId(null);
 setFormName('');
 setFormDesc('');
 setFormIcon('Dumbbell');
 setFormColor('blue');
 setFormStatus('Active');
 setDuplicateWarning(null);
 setDuplicateSuggestions([]);
 setExactDuplicateFound(false);
 setModalOpen(true);
 };

 const isReceptionist = userRole === 'receptionist';
 const isOwnerOrManager = userRole === 'owner' || userRole === 'branch_manager';

 return (
 <div className="min-h-screen bg-white text-neutral-900 flex flex-col relative">

 {/* Toast popup */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all ${
 toast.type === 'success' ? 'bg-success-light text-success border-green-200' : 'bg-danger-light text-danger border-red-200'
 }`}>
 {toast.type === 'success' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
 {toast.message}
 </div>
 )}

 {/* Radial glows */}

 {/* HEADER SECTION */}
 <div className="px-8 pt-8 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-200/60 relative z-10">
 <div>
 <div className="flex items-center gap-2.5">
 <button
 type="button"
 onClick={() => router.push('/workspace/workouts')}
 className="p-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 rounded-xl hover:text-neutral-900 transition cursor-pointer"
 title="Back to Training Studio"
 >
 <ArrowLeft size={14} />
 </button>
 <div className="w-9 h-9 rounded-xl bg-primary-light border border-red-200 flex items-center justify-center shadow-md">
 <Sliders className="w-4 h-4 text-danger" />
 </div>
 <h1 className="text-xl font-black tracking-tight text-neutral-900 font-display">Categories & Metadata</h1>
 </div>
 <p className="text-xs text-neutral-600 mt-1">Configure exercise categories, muscle groups, equipment types, and tags.</p>
 </div>

 {/* Global Toolbar actions */}
 <div className="flex items-center gap-2.5 flex-wrap">
 {activeSection !== 'audit' && activeSection !== 'analytics' && (
 <>
 <button
 type="button"
 onClick={() => setImportOpen(true)}
 disabled={isReceptionist}
 className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 hover:text-neutral-900 text-neutral-700 text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
 >
 <Upload size={13} />
 <span>Bulk Import</span>
 </button>
 <button
 type="button"
 onClick={handleExportData}
 className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 hover:text-neutral-900 text-neutral-700 text-xs font-semibold rounded-xl transition cursor-pointer"
 >
 <Download size={13} />
 <span>JSON Export</span>
 </button>
 </>
 )}

 {isOwnerOrManager && activeSection !== 'audit' && activeSection !== 'analytics' && (
 <button
 type="button"
 onClick={() => setMergeOpen(true)}
 className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-50 border border-neutral-200 hover:border-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition cursor-pointer"
 title="Merge duplicate classifications"
 >
 <GitMerge size={13} className="text-danger" />
 <span>Merge Duplicates</span>
 </button>
 )}

 {activeSection !== 'audit' && activeSection !== 'analytics' && (
 <button
 type="button"
 onClick={handleOpenCreate}
 disabled={isReceptionist}
 className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition shadow-lg cursor-pointer disabled:opacity-50"
 >
 <Plus className="w-4 h-4" />
 <span>Create Item</span>
 </button>
 )}
 </div>
 </div>

 {/* MASTER-DETAIL LAYOUT */}
 <div className="flex-1 flex flex-col md:flex-row relative z-10 overflow-hidden min-h-[500px]">
 
 {/* LEFT SIDEBAR NAVIGATION */}
 <div className="w-full md:w-64 bg-neutral-50/30 border-r border-neutral-100 p-4 space-y-1.5 overflow-y-auto shrink-0">
 <p className="text-[9px] font-extrabold text-neutral-500 uppercase tracking-widest px-3 mb-2">Classification Types</p>
 {sections.map(sec => {
 const isSelected = activeSection === sec.id;
 return (
 <button
 key={sec.id}
 type="button"
 onClick={() => setActiveSection(sec.id)}
 className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition cursor-pointer ${
 isSelected
 ? 'bg-danger text-white shadow-lg font-bold'
 : 'text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50/30'
 }`}
 >
 <sec.icon size={14} className={isSelected ? 'text-neutral-900' : 'text-neutral-500'} />
 <span>{sec.label}</span>
 </button>
 );
 })}
 </div>

 {/* MAIN METADATA VIEWS */}
 <div className="flex-1 p-6 overflow-y-auto flex flex-col">

 {/* --- AUDIT TRAIL VIEW --- */}
 {activeSection === 'audit' && (
 <div className="space-y-4 flex-1 flex flex-col">
 <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
 <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
 <History className="w-4 h-4 text-danger" />
 <span>Metadata Modification History</span>
 </h3>
 <span className="text-[10px] font-mono text-neutral-500">Last 15 changes logged</span>
 </div>

 {loading ? (
 <div className="py-20 text-center text-neutral-500 text-xs">Loading logs...</div>
 ) : !analytics?.auditHistory || analytics.auditHistory.length === 0 ? (
 <div className="py-16 text-center text-neutral-500 text-xs">No audit logs recorded yet.</div>
 ) : (
 <div className="border border-neutral-200 rounded-2xl overflow-hidden divide-y divide-neutral-100/80 bg-white">
 {analytics.auditHistory.map((log: any, idx: number) => (
 <div key={idx} className="p-4 flex items-start justify-between gap-4 text-xs hover:bg-neutral-50/20 transition">
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
 log.action?.includes('Deleted') ? 'bg-danger-light text-danger border-red-200' :
 log.action?.includes('Merged') ? 'bg-purple-950/60 text-purple-400 border-purple-900/20' :
 log.action?.includes('Created') ? 'bg-success-light text-success border-green-200' :
 'bg-neutral-50 text-neutral-600 border-neutral-200'
 }`}>
 {log.action}
 </span>
 <span className="font-semibold text-neutral-800">by {log.user}</span>
 </div>
 <p className="text-neutral-600 mt-1">{log.details}</p>
 </div>
 <span className="text-[10px] text-neutral-500 font-mono shrink-0">
 {new Date(log.timestamp).toLocaleString()}
 </span>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* --- ANALYTICS CHARTS TAB --- */}
 {activeSection === 'analytics' && (
 <div className="space-y-6">
 <div className="border-b border-neutral-100 pb-3">
 <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
 <BarChart3 className="w-4 h-4 text-blue-500" />
 <span>Taxonomy Distribution Analytics</span>
 </h3>
 </div>

 {loading ? (
 <div className="py-20 text-center text-neutral-500 text-xs">Aggregating counts...</div>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Exercises by Muscle Group */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-5">
 <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-4">Exercises by Muscle</h4>
 <div className="space-y-3">
 {analytics?.exercisesByMuscle?.map((item: any, idx: number) => (
 <div key={idx}>
 <div className="flex justify-between text-xs mb-1.5">
 <span className="text-neutral-700 font-medium">{item.name}</span>
 <span className="font-bold text-danger font-mono">{item.usageCount} exercises</span>
 </div>
 <div className="h-2 bg-neutral-50 rounded-full overflow-hidden">
 <div className="h-full bg-danger rounded-full" style={{ width: `${(item.usageCount / Math.max(...analytics.exercisesByMuscle.map((x: any) => x.usageCount), 1)) * 100}%` }} />
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Exercises by Equipment */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-5">
 <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-4">Exercises by Equipment</h4>
 <div className="space-y-3">
 {analytics?.exercisesByEquipment?.map((item: any, idx: number) => (
 <div key={idx}>
 <div className="flex justify-between text-xs mb-1.5">
 <span className="text-neutral-700 font-medium">{item.name}</span>
 <span className="font-bold text-blue-400 font-mono">{item.usageCount} exercises</span>
 </div>
 <div className="h-2 bg-neutral-50 rounded-full overflow-hidden">
 <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(item.usageCount / Math.max(...analytics.exercisesByEquipment.map((x: any) => x.usageCount), 1)) * 100}%` }} />
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Exercises by Difficulty */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-5">
 <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-4">Exercises by Difficulty</h4>
 <div className="space-y-3">
 {analytics?.exercisesByDifficulty?.map((item: any, idx: number) => (
 <div key={idx}>
 <div className="flex justify-between text-xs mb-1.5">
 <span className="text-neutral-700 font-medium">{item.name}</span>
 <span className="font-bold text-primary font-mono">{item.usageCount} exercises</span>
 </div>
 <div className="h-2 bg-neutral-50 rounded-full overflow-hidden">
 <div className="h-full bg-primary rounded-full" style={{ width: `${(item.usageCount / Math.max(...analytics.exercisesByDifficulty.map((x: any) => x.usageCount), 1)) * 100}%` }} />
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Exercises by Category */}
 <div className="bg-white border border-neutral-200 rounded-2xl p-5">
 <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-4">Exercises by Category</h4>
 <div className="space-y-3">
 {analytics?.exercisesByCategory?.map((item: any, idx: number) => (
 <div key={idx}>
 <div className="flex justify-between text-xs mb-1.5">
 <span className="text-neutral-700 font-medium">{item.name}</span>
 <span className="font-bold text-success font-mono">{item.usageCount} exercises</span>
 </div>
 <div className="h-2 bg-neutral-50 rounded-full overflow-hidden">
 <div className="h-full bg-success rounded-full" style={{ width: `${(item.usageCount / Math.max(...analytics.exercisesByCategory.map((x: any) => x.usageCount), 1)) * 100}%` }} />
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 )}

 {/* --- CORE TAXONOMY CLASSIFICATION GRID TABLE --- */}
 {activeSection !== 'audit' && activeSection !== 'analytics' && (
 <div className="flex-1 flex flex-col space-y-4">
 
 {/* Table search & filter toolbar */}
 <div className="flex flex-col md:flex-row gap-3">
 <div className="flex-1 relative">
 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
 <Search size={14} />
 </div>
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={`Search ${sections.find(s => s.id === activeSection)?.label?.toLowerCase()}...`}
 className="w-full bg-neutral-50 border border-neutral-100 focus:border-neutral-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none transition-all"
 />
 </div>

 {/* Status Filter */}
 <select
 value={statusFilter}
 onChange={e => setStatusFilter(e.target.value)}
 className="bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2.5 text-xs text-neutral-700 focus:outline-none focus:border-neutral-200 cursor-pointer shrink-0"
 >
 <option value="Active">Active Items</option>
 <option value="Archived">Archived Items</option>
 <option value="all">All Items</option>
 </select>

 {/* Source Scope Filter */}
 <select
 value={sourceFilter}
 onChange={e => setSourceFilter(e.target.value)}
 className="bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2.5 text-xs text-neutral-700 focus:outline-none focus:border-neutral-200 cursor-pointer shrink-0"
 >
 <option value="all">System & Custom</option>
 <option value="system">System Only</option>
 <option value="custom">Custom Only</option>
 </select>
 </div>

 {/* Data Table */}
 {loading ? (
 <div className="py-20 flex flex-col items-center justify-center gap-3">
 <div className="w-6 h-6 border-2 border-red-200 border-t-transparent rounded-full animate-spin" />
 <span className="text-xs text-neutral-500">Loading catalog taxonomy...</span>
 </div>
 ) : items.length === 0 ? (
 <div className="border border-neutral-200 rounded-2xl p-16 text-center space-y-3 bg-white">
 <HelpCircle className="w-8 h-8 text-neutral-400 mx-auto" />
 <div className="max-w-xs mx-auto">
 <p className="text-xs font-bold text-neutral-700">No Items Found</p>
 <p className="text-[11px] text-neutral-500 leading-relaxed mt-1">We couldn't find any taxonomy items matching your filters.</p>
 </div>
 </div>
 ) : (
 <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xl">
 <table className="w-full text-left border-collapse text-xs">
 <thead>
 <tr className="bg-neutral-50/40 border-b border-neutral-200 text-[10px] text-neutral-500 uppercase font-extrabold tracking-wider">
 <th className="p-4">Name</th>
 <th className="p-4">Description</th>
 <th className="p-4">Preset Source</th>
 <th className="p-4">Status</th>
 <th className="p-4 text-center">Exercise Usage</th>
 <th className="p-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-neutral-100/60">
 {items.map((item) => (
 <tr key={item.id} className="hover:bg-neutral-50/20 transition group">
 <td className="p-4 font-bold text-neutral-800">{item.name}</td>
 <td className="p-4 text-neutral-600 max-w-xs truncate">{item.description || '—'}</td>
 <td className="p-4">
 <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
 item.isSystem ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-success-light text-success border-green-200'
 }`}>
 {item.isSystem ? 'System' : 'Custom'}
 </span>
 </td>
 <td className="p-4">
 <span className={`text-[9px] font-bold ${item.status === 'Active' ? 'text-success' : 'text-neutral-500'}`}>
 {item.status}
 </span>
 </td>
 <td className="p-4 text-center">
 <span className="text-[10px] font-mono font-bold bg-neutral-50 border border-neutral-200 px-2 py-0.5 rounded-md text-neutral-700">
 {item.usageCount} exercises
 </span>
 </td>
 <td className="p-4 text-right">
 <div className="flex justify-end gap-2 text-[10px] font-bold">
 {!item.isSystem && !isReceptionist && (
 <button
 type="button"
 onClick={() => handleOpenEdit(item)}
 className="text-neutral-600 hover:text-neutral-800 p-1 cursor-pointer"
 >
 <Edit2 size={12} />
 </button>
 )}

 {!item.isSystem && !isReceptionist && (
 <button
 type="button"
 onClick={() => handleToggleArchive(item)}
 className="text-neutral-600 hover:text-danger p-1 cursor-pointer"
 title={item.status === 'Active' ? 'Archive item' : 'Restore item'}
 >
 {item.status === 'Active' ? <Archive size={12} /> : <RotateCcw size={12} />}
 </button>
 )}

 {!item.isSystem && !isReceptionist && (
 <button
 type="button"
 onClick={() => handleDeleteItem(item.id)}
 className="text-danger hover:text-danger p-1 cursor-pointer"
 title="Delete item"
 >
 <Trash2 size={12} />
 </button>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {/* Pagination row */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between border-t border-neutral-100 pt-4 text-xs text-neutral-500">
 <span>Showing {items.length} of {totalItems} items</span>
 <div className="flex items-center gap-2">
 <button
 type="button"
 disabled={currentPage === 1}
 onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
 className="p-2 border border-neutral-200 hover:border-neutral-200 hover:text-neutral-900 rounded-xl transition cursor-pointer disabled:opacity-40"
 >
 <ArrowLeft size={13} />
 </button>
 <span className="font-mono text-neutral-700">Page {currentPage} of {totalPages}</span>
 <button
 type="button"
 disabled={currentPage === totalPages}
 onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
 className="p-2 border border-neutral-200 hover:border-neutral-200 hover:text-neutral-900 rounded-xl transition cursor-pointer disabled:opacity-40"
 >
 <ArrowRight size={13} />
 </button>
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 {/* --- TAXONOMY CREATION/EDIT DIALOG --- */}
 {modalOpen && (
 <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
 <form
 onSubmit={handleSubmitForm}
 className="w-full max-w-md bg-white border border-neutral-200 p-6 rounded-3xl space-y-4 shadow-2xl relative"
 >
 <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
 <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
 <Sparkles className="w-4 h-4 text-danger" />
 <span>{isEditing ? `Modify ${activeSection}` : `Register Custom ${activeSection}`}</span>
 </h3>
 <button
 type="button"
 onClick={() => setModalOpen(false)}
 className="text-neutral-500 hover:text-neutral-700 cursor-pointer"
 >
 <X size={18} />
 </button>
 </div>

 <div className="space-y-3">
 {/* Duplicate Prevention warnings */}
 {duplicateWarning && (
 <div className={`p-3 rounded-xl border text-[11px] leading-relaxed flex items-start gap-2 ${
 exactDuplicateFound
 ? 'bg-danger-light text-danger border-red-200'
 : 'bg-warning-light text-amber-700 border-amber-200'
 }`}>
 <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
 <div>
 {duplicateWarning}
 {duplicateSuggestions.length > 0 && (
 <div className="mt-1.5 flex flex-wrap gap-1">
 {duplicateSuggestions.map(sug => (
 <button
 key={sug}
 type="button"
 onClick={() => handleNameChange(sug)}
 className="bg-warning-light border border-amber-200 hover:bg-warning-light text-amber-700 font-mono px-2 py-0.5 rounded text-[9px] cursor-pointer"
 >
 Use {sug}
 </button>
 ))}
 </div>
 )}
 </div>
 </div>
 )}

 {/* Name */}
 <div className="space-y-1">
 <label className="text-[11px] text-neutral-600 font-semibold">Name *</label>
 <input
 type="text"
 required
 placeholder={`e.g. ${activeSection === 'Equipment' ? 'EZ Bar' : 'Olympic Lifting'}`}
 value={formName}
 onChange={e => handleNameChange(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 focus:border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-900 focus:outline-none placeholder-neutral-400"
 />
 </div>

 {/* Description */}
 <div className="space-y-1">
 <label className="text-[11px] text-neutral-600 font-semibold">Description</label>
 <textarea
 placeholder="Provide taxonomy metadata descriptions..."
 value={formDesc}
 onChange={e => setFormDesc(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 focus:border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none placeholder-neutral-400 h-20 resize-none"
 />
 </div>

 {/* Icon (for equipment/categories) */}
 {(activeSection === 'Equipment' || activeSection === 'Category') && (
 <div className="space-y-1">
 <label className="text-[11px] text-neutral-600 font-semibold">Icon</label>
 <select
 value={formIcon}
 onChange={e => setFormIcon(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none cursor-pointer"
 >
 <option value="Dumbbell">Dumbbell / Weight</option>
 <option value="Activity">Activity / Cardio</option>
 <option value="Sliders">Sliders / Functional</option>
 <option value="Target">Target / Precision</option>
 <option value="Sparkles">Sparkles / Special</option>
 <option value="Heart">Heart / Corrective</option>
 </select>
 </div>
 )}

 {/* Color (for tags/difficulty) */}
 {(activeSection === 'Tag' || activeSection === 'Difficulty') && (
 <div className="space-y-1">
 <label className="text-[11px] text-neutral-600 font-semibold">Badge Color</label>
 <select
 value={formColor}
 onChange={e => setFormColor(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 focus:outline-none cursor-pointer"
 >
 <option value="blue">Blue (Standard)</option>
 <option value="green">Green (Beginner/Eco)</option>
 <option value="orange">Orange (Medium/Intermediate)</option>
 <option value="rose">Rose (HIIT/Aggressive)</option>
 <option value="purple">Purple (Advanced)</option>
 <option value="sky">Sky Blue (Soft/Recover)</option>
 </select>
 </div>
 )}
 </div>

 {/* Modal Actions */}
 <div className="pt-3 border-t border-neutral-100 flex justify-end gap-2.5">
 <button
 type="button"
 onClick={() => setModalOpen(false)}
 className="px-3.5 py-2.5 bg-neutral-50 hover:bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={submitting || (exactDuplicateFound && !isEditing)}
 className="px-4.5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
 >
 {submitting && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
 <span>{isEditing ? 'Save Changes' : 'Create'}</span>
 </button>
 </div>
 </form>
 </div>
 )}

 {/* --- DUPLICATE CATEGORY MERGE PANEL --- */}
 {mergeOpen && (
 <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
 <form
 onSubmit={handleExecuteMerge}
 className="w-full max-w-md bg-white border border-neutral-200 p-6 rounded-3xl space-y-4 shadow-2xl relative"
 >
 <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
 <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
 <GitMerge className="w-4 h-4 text-danger" />
 <span>Merge Duplicate Categories</span>
 </h3>
 <button
 type="button"
 onClick={() => setMergeOpen(false)}
 className="text-neutral-500 hover:text-neutral-700 cursor-pointer"
 >
 <X size={18} />
 </button>
 </div>

 <div className="p-3 bg-danger-light border border-red-200 text-danger text-[11px] leading-relaxed rounded-xl flex items-start gap-2">
 <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
 <p>
 <strong>Warning:</strong> Merging is permanent. All exercises linked to the duplicate source will automatically update to use the canonical target name. The duplicate source will be archived.
 </p>
 </div>

 <div className="space-y-3">
 {/* Source Select */}
 <div className="space-y-1">
 <label className="text-[11px] text-neutral-600 font-semibold">Duplicate Source (Archived after merge)</label>
 <select
 value={mergeSourceId}
 onChange={e => setMergeSourceId(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-700 focus:outline-none cursor-pointer"
 >
 <option value="">-- Select Source Category --</option>
 {items.map(item => (
 <option key={item.id} value={item.id}>[{item.type}] {item.name}</option>
 ))}
 </select>
 </div>

 {/* Target Select */}
 <div className="space-y-1">
 <label className="text-[11px] text-neutral-600 font-semibold">Canonical Target (Retained & Accumulates usages)</label>
 <select
 value={mergeTargetId}
 onChange={e => setMergeTargetId(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-700 focus:outline-none cursor-pointer"
 >
 <option value="">-- Select Target Category --</option>
 {items.map(item => (
 <option key={item.id} value={item.id}>[{item.type}] {item.name}</option>
 ))}
 </select>
 </div>
 </div>

 {/* Merge Actions */}
 <div className="pt-3 border-t border-neutral-100 flex justify-end gap-2.5">
 <button
 type="button"
 onClick={() => setMergeOpen(false)}
 className="px-3.5 py-2.5 bg-neutral-50 hover:bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={merging || !mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId}
 className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
 >
 {merging && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
 <span>Merge Now</span>
 </button>
 </div>
 </form>
 </div>
 )}

 {/* --- BULK IMPORT DIALOG --- */}
 {importOpen && (
 <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
 <form
 onSubmit={handleImportSubmit}
 className="w-full max-w-lg bg-white border border-neutral-200 p-6 rounded-3xl space-y-4 shadow-2xl relative"
 >
 <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
 <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
 <Upload className="w-4 h-4 text-blue-500" />
 <span>Bulk Import JSON data</span>
 </h3>
 <button
 type="button"
 onClick={() => setImportOpen(false)}
 className="text-neutral-500 hover:text-neutral-700 cursor-pointer"
 >
 <X size={18} />
 </button>
 </div>

 <div className="space-y-2">
 <label className="text-[11px] text-neutral-600 font-semibold block">Paste Taxonomy JSON Array</label>
 <p className="text-[10px] text-neutral-500 leading-relaxed">
 Provide valid JSON schema matching: <code>{"[ { \"name\": \"Category Name\", \"description\": \"...\" } ]"}</code>
 </p>
 <textarea
 placeholder='[{"name":"Custom TRX Upper","description":"TRX functional routines"}]'
 value={importText}
 onChange={e => setImportText(e.target.value)}
 className="w-full bg-neutral-50 border border-neutral-200 focus:border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none placeholder-neutral-400 h-44 resize-none font-mono"
 />
 </div>

 {/* Import Actions */}
 <div className="pt-3 border-t border-neutral-100 flex justify-end gap-2.5">
 <button
 type="button"
 onClick={() => setImportOpen(false)}
 className="px-3.5 py-2.5 bg-neutral-50 hover:bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl cursor-pointer"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={importing || !importText.trim()}
 className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
 >
 {importing && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
 <span>Import Data</span>
 </button>
 </div>
 </form>
 </div>
 )}
 </div>
 );
}
