'use client';

import { useRef, useState } from 'react';
import { Upload, ImageOff } from 'lucide-react';
import { platformGlobalSettingsApi } from '@/lib/api';

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function BrandingLogoUpload({
  label,
  value,
  onChange,
  disabled,
  showToast,
}: {
  label: string;
  value: string | null;
  onChange: (url: string) => void;
  disabled?: boolean;
  showToast: (m: string, t?: 'success' | 'error') => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const res = await platformGlobalSettingsApi.uploadBrandingAsset(file);
      onChange(res.url);
      showToast(`${label} uploaded.`);
    } catch {
      showToast(`Failed to upload ${label.toLowerCase()}.`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const previewUrl = value ? (value.startsWith('http') ? value : `${API_ORIGIN}${value}`) : null;

  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
          {previewUrl ? <img src={previewUrl} alt={label} className="max-w-full max-h-full object-contain" /> : <ImageOff size={18} className="text-slate-700" />}
        </div>
        <div className="space-y-1.5">
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-indigo-500/30 text-[11px] font-bold text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Upload size={12} /> {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <p className="text-[10px] text-slate-600">PNG, JPEG, SVG, WebP or ICO, up to 10MB.</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon,image/vnd.microsoft.icon"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
