'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
 UploadCloud,
 Building2,
 Image as ImageIcon,
 Trash2,
 Download,
 Crop,
 Eye,
 CheckCircle,
 Maximize2,
 Calendar,
 X,
} from 'lucide-react';
import { gymApi, orgApi, rolesApi } from '../../../../lib/api';

interface GymBranch {
 id: string;
 organizationId: string;
 name: string;
 code: string | null;
 settings: any;
 createdAt: string;
 updatedAt: string;
}

interface GalleryItem {
 id: string;
 url: string;
 name: string;
 category: string;
 fileSize: string;
 resolution: string;
 uploadedBy: string;
 createdAt: string;
 featured?: boolean;
}

export default function GymMediaManagementPage() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const branchIdParam = searchParams.get('id');

 // Loading States
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [gymBranches, setGymBranches] = useState<GymBranch[]>([]);
 const [selectedBranchId, setSelectedBranchId] = useState<string>('');
 const [orgName, setOrgName] = useState('Organization');
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

 // Active Category Filter for Gallery
 const [activeCategory, setActiveCategory] = useState<string>('all');

 // Modal / Overlays States
 const [selectedViewerItem, setSelectedViewerItem] = useState<GalleryItem | null>(null);
 const [itemToDelete, setItemToDelete] = useState<GalleryItem | null>(null);
 const [uploadProgress, setUploadProgress] = useState<number | null>(null);

 // Form Branding State
 const [brandData, setBrandData] = useState({
 name: '',
 logoUrl: '/presets/logo-default.png',
 bannerUrl: '/presets/banner-default.jpg',
 primaryColor: '#f43f5e',
 secondaryColor: '#fb923c',
 accentColor: '#10b981',
 watermarkEnabled: false,
 watermarkType: 'logo',
 gallery: [] as GalleryItem[]
 });

 const storageLimit = 100; // 100 MB Limit
 const getGallerySizeMB = () => {
 const bytes = brandData.gallery.length * 1024 * 1024 * 1.5; // Mock 1.5MB per image
 return Number((bytes / (1024 * 1024)).toFixed(1));
 };

 const showToast = (message: string, type: 'success' | 'error' = 'success') => {
 setToast({ message, type });
 setTimeout(() => setToast(null), 3000);
 };

 const loadData = async (branchId: string) => {
 try {
 setLoading(true);
 const orgId = localStorage.getItem('organizationId');
 if (!orgId) {
 router.push('/organizations');
 return;
 }

 const orgs = await orgApi.list();
 const currentOrg = orgs.find((o: any) => o.id === orgId);
 if (currentOrg) setOrgName(currentOrg.name);

 const branches = await gymApi.list(orgId);
 setGymBranches(branches || []);

 const targetBranchId = branchId || branches[0]?.id || '';
 setSelectedBranchId(targetBranchId);

 if (targetBranchId) {
 const branch = branches.find((b: any) => b.id === targetBranchId);
 if (branch) {
 const s = branch.settings || {};

 setBrandData({
 name: branch.name,
 logoUrl: s.logoUrl || '',
 bannerUrl: s.bannerUrl || '',
 primaryColor: s.primaryColor || '#f43f5e',
 secondaryColor: s.secondaryColor || '#fb923c',
 accentColor: s.accentColor || '#10b981',
 watermarkEnabled: s.watermarkEnabled || false,
 watermarkType: s.watermarkType || 'logo',
 gallery: s.gallery || []
 });
 }
 }
 } catch (err) {
 console.error(err);
 showToast('Failed to load branding assets.', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData(branchIdParam || '');
 }, [branchIdParam]);

 const handleBranchSwitch = (id: string) => {
 const params = new URLSearchParams(window.location.search);
 params.set('id', id);
 router.push(`/workspace/gyms/media?${params.toString()}`);
 };

 const handleSaveBranding = async (updatedFields: Partial<typeof brandData>) => {
 try {
 setSaving(true);
 const nextBrand = { ...brandData, ...updatedFields };

 // Load existing branch to keep other settings intact
 const orgId = localStorage.getItem('organizationId') || '';
 const list = await gymApi.list(orgId);
 const branch = list.find(b => b.id === selectedBranchId);

 const payload = {
 name: branch.name,
 code: branch.code,
 address: branch.address,
 latitude: branch.latitude,
 longitude: branch.longitude,
 contactPhone: branch.contactPhone,
 contactEmail: branch.contactEmail,
 settings: {
 ...(branch.settings || {}),
 logoUrl: nextBrand.logoUrl,
 bannerUrl: nextBrand.bannerUrl,
 primaryColor: nextBrand.primaryColor,
 secondaryColor: nextBrand.secondaryColor,
 accentColor: nextBrand.accentColor,
 watermarkEnabled: nextBrand.watermarkEnabled,
 watermarkType: nextBrand.watermarkType,
 gallery: nextBrand.gallery
 }
 };

 await gymApi.update(selectedBranchId, payload);
 setBrandData(nextBrand);
 showToast('Branding assets updated successfully!', 'success');
 } catch (err) {
 console.error(err);
 showToast('Failed to save branding assets.', 'error');
 } finally {
 setSaving(false);
 }
 };

 const simulateUpload = (type: 'logo' | 'banner' | 'gallery') => {
 setUploadProgress(10);
 const interval = setInterval(() => {
 setUploadProgress(prev => {
 if (prev === null) return null;
 if (prev >= 100) {
 clearInterval(interval);
 setTimeout(() => setUploadProgress(null), 500);

 if (type === 'logo') {
 handleSaveBranding({ logoUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200' });
 } else if (type === 'banner') {
 handleSaveBranding({ bannerUrl: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200' });
 } else if (type === 'gallery') {
 const newImg: GalleryItem = {
 id: String(Date.now()),
 url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800',
 name: 'Uploaded Gym View.jpg',
 category: 'Interior',
 fileSize: '1.5 MB',
 resolution: '1920x1080',
 uploadedBy: 'Marcus Vance',
 createdAt: new Date().toISOString()
 };
 handleSaveBranding({ gallery: [...brandData.gallery, newImg] });
 }

 return 100;
 }
 return prev + 30;
 });
 }, 150);
 };

 const handleSetFeatured = (itemId: string) => {
 const nextGallery = brandData.gallery.map(item => ({
 ...item,
 featured: item.id === itemId
 }));
 handleSaveBranding({ gallery: nextGallery });
 showToast('Featured gallery image changed!', 'success');
 };

 const handleDeleteItem = () => {
 if (itemToDelete) {
 const nextGallery = brandData.gallery.filter(item => item.id !== itemToDelete.id);
 handleSaveBranding({ gallery: nextGallery });
 setItemToDelete(null);
 showToast('Gallery image deleted.', 'success');
 }
 };

 const filteredGallery = activeCategory === 'all'
 ? brandData.gallery
 : brandData.gallery.filter(item => item.category.toLowerCase() === activeCategory.toLowerCase());

 const sizeUsed = getGallerySizeMB();
 const percentageUsed = (sizeUsed / storageLimit) * 100;

 return (
 <div className="min-h-screen bg-white text-neutral-900 flex flex-col relative overflow-y-auto pb-16">

 {/* Toast alert */}
 {toast && (
 <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 border ${toast.type === 'success'
 ? 'bg-success-light text-success border-green-200'
 : 'bg-danger-light text-danger border-red-200'
 }`}>
 <CheckCircle className="w-5 h-5 text-success" />
 <span className="text-sm font-medium">{toast.message}</span>
 </div>
 )}

 {/* HEADER SECTION */}
 <div className="border-b border-neutral-200/80 bg-neutral-50/40 backdrop-blur-md px-8 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
 <div>
 <div className="flex items-center gap-2 text-xs text-danger font-semibold uppercase tracking-wider mb-1">
 <Building2 className="w-3.5 h-3.5" />
 <span>{orgName}</span>
 </div>
 <h1 className="text-2xl font-bold text-neutral-900 font-display">Media & Branding Assets</h1>
 <p className="text-sm text-neutral-600 mt-1">Manage physical identifiers, banner cover templates, and gallery folders.</p>
 </div>

 {/* Branch switcher dropdown */}
 <div className="flex items-center gap-3">
 <label className="text-xs text-neutral-500 font-mono">Switch Branch:</label>
 <select
 className="bg-white border border-neutral-200 rounded-xl p-2.5 text-xs text-neutral-800 focus:outline-none"
 value={selectedBranchId}
 onChange={e => handleBranchSwitch(e.target.value)}
 >
 {gymBranches.map(b => (
 <option key={b.id} value={b.id}>{b.name}</option>
 ))}
 </select>
 </div>
 </div>

 {/* TWO COLUMN ASSET MANAGER */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-8 mt-6">

 {/* COLUMN 1: CONTROLS & BRAND IDENTITY SETTINGS */}
 <div className="space-y-6 col-span-1">

 {/* STORAGE TRACKER PANEL */}
 <div className="bg-white border border-neutral-200 p-6 rounded-3xl space-y-4">
 <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">Storage Capacity</span>

 <div className="space-y-2">
 <div className="flex justify-between text-xs font-mono">
 <span className="text-neutral-500">Used Storage:</span>
 <span className="text-danger font-bold">{sizeUsed} MB / {storageLimit} MB</span>
 </div>

 <div className="w-full h-2 bg-neutral-50 rounded-full overflow-hidden border border-neutral-200">
 <div
 className="h-full bg-primary transition-all duration-300"
 style={{ width: `${percentageUsed}%` }}
 />
 </div>
 </div>

 <span className="text-[10px] text-neutral-500 block leading-normal">
 Uploading images automatically consumes storage space. Upgrade your subscription plan to expand limits.
 </span>
 </div>

 {/* BRAND COLOR ACCENTS EDITOR */}
 <div className="bg-white border border-neutral-200 p-6 rounded-3xl space-y-4">
 <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">Brand Color Palette</span>

 <div className="space-y-4">
 <div className="grid grid-cols-3 gap-2">
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-500 block font-mono">Primary</label>
 <input
 type="color"
 className="w-full h-8 bg-transparent border-0 cursor-pointer rounded-lg"
 value={brandData.primaryColor}
 onChange={e => setBrandData(prev => ({ ...prev, primaryColor: e.target.value }))}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-500 block font-mono">Secondary</label>
 <input
 type="color"
 className="w-full h-8 bg-transparent border-0 cursor-pointer rounded-lg"
 value={brandData.secondaryColor}
 onChange={e => setBrandData(prev => ({ ...prev, secondaryColor: e.target.value }))}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] text-neutral-500 block font-mono">Accent</label>
 <input
 type="color"
 className="w-full h-8 bg-transparent border-0 cursor-pointer rounded-lg"
 value={brandData.accentColor}
 onChange={e => setBrandData(prev => ({ ...prev, accentColor: e.target.value }))}
 />
 </div>
 </div>

 <button
 type="button"
 onClick={() => handleSaveBranding({})}
 className="w-full py-2 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-xs text-neutral-800 font-semibold rounded-xl transition"
 >
 Apply Color Codes
 </button>
 </div>
 </div>

 {/* WATERMARK SETTINGS */}
 <div className="bg-white border border-neutral-200 p-6 rounded-3xl space-y-4">
 <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">Image Watermarking (Future)</span>

 <div className="flex items-center justify-between border-b border-neutral-200/40 pb-3">
 <label className="text-xs text-neutral-700 font-semibold cursor-pointer select-none" htmlFor="watermark-toggle">
 Auto Apply Brand Watermark
 </label>
 <input
 id="watermark-toggle"
 type="checkbox"
 checked={brandData.watermarkEnabled}
 onChange={e => handleSaveBranding({ watermarkEnabled: e.target.checked })}
 className="rounded bg-neutral-50 border-neutral-200 text-danger focus:ring-0 focus:ring-offset-0"
 />
 </div>

 {brandData.watermarkEnabled && (
 <div className="space-y-3">
 <label className="text-[10px] text-neutral-500 block font-mono">Watermark Type</label>
 <div className="grid grid-cols-2 gap-2 text-xs">
 {['logo', 'text'].map(t => (
 <button
 key={t}
 type="button"
 onClick={() => handleSaveBranding({ watermarkType: t })}
 className={`py-1.5 rounded-lg border font-semibold capitalize ${brandData.watermarkType === t
 ? 'border-red-200 bg-danger-light text-danger'
 : 'border-neutral-200 bg-white text-neutral-600'
 }`}
 >
 {t} Overlay
 </button>
 ))}
 </div>
 </div>
 )}
 </div>

 </div>

 {/* COLUMN 2 & 3: LOGO, BANNER, AND GALLERY */}
 <div className="lg:col-span-2 space-y-6">

 {/* UPLOAD PROGRESS INDICATION BAR */}
 {uploadProgress !== null && (
 <div className="bg-white border border-red-200 p-4 rounded-2xl flex items-center justify-between gap-4">
 <span className="text-xs text-danger font-bold">Uploading Brand Asset...</span>
 <div className="flex-1 h-1 bg-neutral-50 rounded-full overflow-hidden max-w-md">
 <div className="h-full bg-danger" style={{ width: `${uploadProgress}%` }} />
 </div>
 <span className="text-xs text-neutral-500 font-mono">{uploadProgress}%</span>
 </div>
 )}

 {/* LOGO & BANNER PANEL */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

 {/* LOGO CARD */}
 <div className="bg-white border border-neutral-200 p-6 rounded-3xl space-y-4">
 <span className="text-xs font-bold text-neutral-800 block uppercase tracking-wider">Gym Logo Identity</span>

 <div className="flex gap-6 items-center">
 <div className="w-20 h-20 rounded-2xl border border-neutral-200 bg-neutral-50 flex items-center justify-center relative overflow-hidden shrink-0">
 {brandData.logoUrl ? (
 <img src={brandData.logoUrl} alt="Logo" className="object-cover w-full h-full" />
 ) : (
 <Building2 className="w-8 h-8 text-neutral-400" />
 )}
 </div>

 <div className="space-y-1.5 text-xs">
 <span className="font-bold text-neutral-700 block">Recommended Specifications</span>
 <span className="text-neutral-500 block leading-normal">PNG or SVG format. Transparent background. Resolution 512x512px. Max file size 10MB.</span>
 </div>
 </div>

 <div className="flex gap-2 pt-2 border-t border-neutral-200/60">
 <button
 type="button"
 onClick={() => simulateUpload('logo')}
 className="flex-1 py-2 bg-neutral-100 px-3 hover:bg-neutral-50 border border-neutral-200 text-xs font-semibold rounded-xl text-neutral-800 transition"
 >
 Upload Logo
 </button>
 {brandData.logoUrl && (
 <button
 type="button"
 onClick={() => handleSaveBranding({ logoUrl: '' })}
 className="py-2 px-3 border border-neutral-200 hover:border-red-200 text-danger hover:bg-danger-light text-xs font-semibold rounded-xl transition"
 >
 Remove
 </button>
 )}
 </div>
 </div>

 {/* BANNER CARD */}
 <div className="bg-white border border-neutral-200 p-6 rounded-3xl space-y-4">
 <span className="text-xs font-bold text-neutral-800 block uppercase tracking-wider">Cover Banner Template</span>

 <div className="h-20 w-full bg-neutral-50 border border-neutral-200 rounded-2xl relative overflow-hidden flex items-center justify-center">
 {brandData.bannerUrl ? (
 <img src={brandData.bannerUrl} alt="Banner" className="object-cover w-full h-full" />
 ) : (
 <span className="text-xs text-neutral-400 font-mono">No Banner Uploaded</span>
 )}
 </div>

 <div className="flex gap-2 pt-2 text-xs">
 <button
 type="button"
 onClick={() => simulateUpload('banner')}
 className="flex-1 py-2 bg-neutral-100 px-3 hover:bg-neutral-50 border border-neutral-200 text-xs font-semibold rounded-xl text-neutral-800 transition"
 >
 Upload Banner
 </button>
 {brandData.bannerUrl && (
 <button
 type="button"
 onClick={() => handleSaveBranding({ bannerUrl: '' })}
 className="py-2 px-3 border border-neutral-200 hover:border-red-200 text-danger hover:bg-danger-light text-xs font-semibold rounded-xl transition"
 >
 Remove
 </button>
 )}
 </div>
 </div>

 </div>

 {/* GALLERY MANAGEMENT */}
 <div className="bg-white border border-neutral-200 p-6 rounded-3xl space-y-6">

 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-200/80 pb-4">
 <div>
 <span className="text-xs font-bold text-neutral-800 block uppercase tracking-wider">Branch Gallery Grid</span>
 <span className="text-[10px] text-neutral-500 block mt-0.5">Manage physical training rooms, pool, and facilities photos.</span>
 </div>

 {/* Category Filter selector */}
 <div className="flex flex-wrap gap-1 text-[10px]">
 {['all', 'interior', 'exterior', 'equipment', 'facilities'].map(c => (
 <button
 key={c}
 type="button"
 onClick={() => setActiveCategory(c)}
 className={`px-2.5 py-1 rounded-lg border font-semibold capitalize transition ${activeCategory === c
 ? 'border-red-200 bg-danger-light text-danger'
 : 'border-neutral-200 bg-white text-neutral-600'
 }`}
 >
 {c}
 </button>
 ))}
 </div>
 </div>

 {/* DRAG AND DROP ZONE */}
 <div
 onClick={() => simulateUpload('gallery')}
 className="border-2 border-neutral-200 border-dashed rounded-3xl p-8 text-center hover:border-red-200 cursor-pointer transition flex flex-col items-center"
 >
 <UploadCloud className="w-8 h-8 text-neutral-400 mb-2 animate-bounce" />
 <span className="text-xs font-bold text-neutral-700 block">Drag & Drop photos here, or click to browse</span>
 <span className="text-[10px] text-neutral-500 block mt-1">Recommended: JPG, PNG, WEBP. Max size 10MB.</span>
 </div>

 {/* IMAGES GRID */}
 {filteredGallery.length === 0 ? (
 <div className="text-center p-8 text-xs text-neutral-500 italic">
 No gallery photos found matching this category. Select"Upload" to add.
 </div>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
 {filteredGallery.map(img => (
 <div key={img.id} className="group bg-neutral-50 border border-neutral-200 rounded-2xl overflow-hidden relative flex flex-col justify-between">

 {/* Thumbnail */}
 <div className="h-32 w-full relative overflow-hidden bg-neutral-50 flex items-center justify-center">
 <img src={img.url} alt={img.name} className="object-cover w-full h-full group-hover:scale-105 transition duration-300" />

 {/* Featured Star Banner */}
 {img.featured && (
 <span className="absolute top-2 left-2 bg-primary text-neutral-400 text-[9px] font-bold px-2 py-0.5 rounded-md">
 Featured
 </span>
 )}

 {/* Lightbox Trigger Icon */}
 <button
 onClick={() => setSelectedViewerItem(img)}
 className="absolute bottom-2 right-2 p-1.5 bg-neutral-50/80 hover:bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-700 hidden group-hover:block transition"
 >
 <Maximize2 size={12} />
 </button>
 </div>

 {/* Metadata Footer */}
 <div className="p-3 space-y-1">
 <span className="text-[10px] font-bold text-neutral-700 block truncate">{img.name}</span>
 <div className="flex justify-between items-center text-[9px] text-neutral-500">
 <span>{img.category}</span>
 <span>{img.fileSize}</span>
 </div>
 </div>

 {/* Image Hover Actions Row */}
 <div className="p-2 border-t border-neutral-100 flex justify-between bg-neutral-50/90 text-[10px]">
 <button
 type="button"
 onClick={() => handleSetFeatured(img.id)}
 disabled={img.featured}
 className={`font-semibold ${img.featured ? 'text-primary' : 'text-neutral-600 hover:text-neutral-800'}`}
 >
 {img.featured ? 'Featured' : 'Make Featured'}
 </button>
 <button
 type="button"
 onClick={() => setItemToDelete(img)}
 className="text-danger hover:text-danger"
 >
 Delete
 </button>
 </div>

 </div>
 ))}
 </div>
 )}

 </div>

 </div>

 </div>

 {/* FULL SCREEN LIGHTBOX VIEWER */}
 {selectedViewerItem && (
 <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-6 backdrop-blur-sm">
 <div className="max-w-3xl w-full bg-neutral-50 border border-neutral-200 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row h-[500px]">

 {/* Image display */}
 <div className="flex-1 bg-neutral-50 flex items-center justify-center relative p-4 border-r border-neutral-200">
 <img src={selectedViewerItem.url} alt={selectedViewerItem.name} className="object-contain max-h-full max-w-full" />
 <button
 type="button"
 onClick={() => setSelectedViewerItem(null)}
 className="absolute top-4 right-4 p-2 bg-neutral-50 border border-neutral-200 rounded-full text-neutral-600 hover:text-neutral-800"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 {/* Properties Sidebar */}
 <div className="w-72 p-6 flex flex-col justify-between shrink-0 bg-neutral-50/40">
 <div className="space-y-4">
 <div>
 <span className="text-[10px] text-neutral-500 font-mono block uppercase">File Name</span>
 <span className="text-xs font-bold text-neutral-800 block truncate mt-1">{selectedViewerItem.name}</span>
 </div>
 <div>
 <span className="text-[10px] text-neutral-500 font-mono block uppercase">Folder Category</span>
 <span className="text-xs text-neutral-700 block mt-1">{selectedViewerItem.category}</span>
 </div>
 <div>
 <span className="text-[10px] text-neutral-500 font-mono block uppercase">File Size</span>
 <span className="text-xs text-neutral-700 block mt-1">{selectedViewerItem.fileSize}</span>
 </div>
 <div>
 <span className="text-[10px] text-neutral-500 font-mono block uppercase">Resolution</span>
 <span className="text-xs text-neutral-700 block mt-1">{selectedViewerItem.resolution}</span>
 </div>
 <div>
 <span className="text-[10px] text-neutral-500 font-mono block uppercase">Uploaded By</span>
 <span className="text-xs text-neutral-700 block mt-1">{selectedViewerItem.uploadedBy}</span>
 </div>
 </div>

 <div className="space-y-2 pt-4 border-t border-neutral-200/80">
 <button
 type="button"
 onClick={() => {
 const next = brandData.gallery.filter(i => i.id !== selectedViewerItem.id);
 handleSaveBranding({ gallery: next });
 setSelectedViewerItem(null);
 showToast('Image deleted.', 'success');
 }}
 className="w-full py-2 bg-danger-light border border-red-200 text-danger text-xs font-semibold rounded-xl"
 >
 Delete Asset
 </button>
 </div>
 </div>

 </div>
 </div>
 )}

 {/* DELETE CONFIRMATION MODAL */}
 {itemToDelete && (
 <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-6 backdrop-blur-sm">
 <div className="max-w-md w-full bg-neutral-50 border border-neutral-200 p-6 rounded-3xl text-center space-y-4 shadow-2xl relative">
 <div className="w-12 h-12 bg-danger-light border border-red-200 rounded-full flex items-center justify-center mx-auto text-danger mb-2">
 <Trash2 className="w-6 h-6" />
 </div>

 <div className="space-y-1">
 <h3 className="text-base font-bold text-neutral-900">Confirm Asset Deletion</h3>
 <p className="text-xs text-neutral-600">
 Are you sure you want to permanently delete"{itemToDelete.name}"? This action cannot be undone.
 </p>
 </div>

 {/* Image Preview inside Delete */}
 <div className="h-24 w-32 mx-auto rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 flex items-center justify-center">
 <img src={itemToDelete.url} alt={itemToDelete.name} className="object-cover w-full h-full" />
 </div>

 <div className="flex gap-2 pt-2 text-xs">
 <button
 type="button"
 onClick={handleDeleteItem}
 className="flex-1 py-2.5 bg-danger hover:bg-red-600 text-neutral-900 font-semibold rounded-xl"
 >
 Delete Photo
 </button>
 <button
 type="button"
 onClick={() => setItemToDelete(null)}
 className="flex-1 py-2.5 bg-neutral-50 border border-neutral-200 text-neutral-700 hover:bg-neutral-100 font-semibold rounded-xl"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 )}

 </div>
 );
}
