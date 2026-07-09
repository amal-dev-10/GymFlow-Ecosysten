'use client';

import React from 'react';
import { Megaphone } from 'lucide-react';
import { usePlatformWidget } from '@/hooks/usePlatformWidget';
import type { AnnouncementItem } from '@/types/dashboard';
import WidgetShell from './WidgetShell';
import WidgetEmptyState from './WidgetEmptyState';

const CATEGORY_LABEL: Record<AnnouncementItem['category'], string> = {
  maintenance: 'Maintenance',
  update: 'Update',
  release: 'Release',
  internal: 'Internal',
};

export default function Announcements(props: { id: string; onHide?: (id: string) => void; draggable?: boolean; onDragStart?: (id: string) => void; onDragOver?: (e: React.DragEvent) => void; onDrop?: (id: string) => void; favorite?: boolean; onToggleFavorite?: (id: string) => void }) {
  const { data, loading, connected } = usePlatformWidget<AnnouncementItem[]>('announcements');

  return (
    <WidgetShell id={props.id} title="Announcements" icon={Megaphone} onHide={props.onHide} draggable={props.draggable} onDragStart={props.onDragStart} onDragOver={props.onDragOver} onDrop={props.onDrop} favorite={props.favorite} onToggleFavorite={props.onToggleFavorite}>
      {loading ? (
        <div className="h-28 bg-slate-900/40 rounded-xl animate-pulse" />
      ) : !connected || !data || data.length === 0 ? (
        <WidgetEmptyState label="Maintenance windows and release notes will appear here." />
      ) : (
        <div className="space-y-1.5">
          {data.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-xs bg-slate-950/40 rounded-lg px-3 py-2">
              <span className="text-slate-300 font-semibold truncate">{a.title}</span>
              <span className="text-[8px] font-bold uppercase text-indigo-400 shrink-0 ml-2">{CATEGORY_LABEL[a.category]}</span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
