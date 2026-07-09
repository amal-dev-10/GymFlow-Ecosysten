'use client';

import { useCallback, useEffect, useState } from 'react';

export const DEFAULT_WIDGET_ORDER = [
  'platform-health',
  'system-monitoring',
  'revenue-analytics',
  'organization-overview',
  'subscription-overview',
  'platform-usage',
  'support-overview',
  'activity-timeline',
  'alerts-center',
  'recent-deployments',
  'announcements',
  'audit-snapshot',
];

const STORAGE_KEY = 'platform_dashboard_layout_v1';

interface LayoutState {
  order: string[];
  hidden: string[];
  favorites: string[];
}

function loadLayout(): LayoutState {
  if (typeof window === 'undefined') {
    return { order: DEFAULT_WIDGET_ORDER, hidden: [], favorites: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { order: DEFAULT_WIDGET_ORDER, hidden: [], favorites: [] };
    const parsed = JSON.parse(raw);
    // Merge in any newly-added default widgets that aren't in a saved layout yet.
    const merged = [...parsed.order, ...DEFAULT_WIDGET_ORDER.filter((id) => !parsed.order.includes(id))];
    return { order: merged, hidden: parsed.hidden || [], favorites: parsed.favorites || [] };
  } catch {
    return { order: DEFAULT_WIDGET_ORDER, hidden: [], favorites: [] };
  }
}

/**
 * Drives "Dashboard Personalization": move (drag-reorder), hide, favorite,
 * save, and restore-default-layout for the Platform Dashboard's widgets.
 * Persisted to localStorage per browser/admin.
 */
export function useDashboardLayout() {
  const [order, setOrder] = useState<string[]>(DEFAULT_WIDGET_ORDER);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const layout = loadLayout();
    setOrder(layout.order);
    setHidden(new Set(layout.hidden));
    setFavorites(new Set(layout.favorites));
    setMounted(true);
  }, []);

  const persist = useCallback((next: Partial<LayoutState>) => {
    const layout: LayoutState = {
      order: next.order ?? order,
      hidden: next.hidden ?? Array.from(hidden),
      favorites: next.favorites ?? Array.from(favorites),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }, [order, hidden, favorites]);

  const hideWidget = useCallback((id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.add(id);
      persist({ hidden: Array.from(next) });
      return next;
    });
  }, [persist]);

  const showWidget = useCallback((id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.delete(id);
      persist({ hidden: Array.from(next) });
      return next;
    });
  }, [persist]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist({ favorites: Array.from(next) });
      return next;
    });
  }, [persist]);

  const handleDragStart = useCallback((id: string) => setDragId(id), []);

  const handleDrop = useCallback((dropId: string) => {
    if (!dragId || dragId === dropId) return;
    setOrder((prev) => {
      const next = [...prev];
      const fromIdx = next.indexOf(dragId);
      const toIdx = next.indexOf(dropId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, dragId);
      persist({ order: next });
      return next;
    });
    setDragId(null);
  }, [dragId, persist]);

  const restoreDefault = useCallback(() => {
    setOrder(DEFAULT_WIDGET_ORDER);
    setHidden(new Set());
    setFavorites(new Set());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    mounted,
    order,
    hidden,
    favorites,
    isCustomized: hidden.size > 0 || JSON.stringify(order) !== JSON.stringify(DEFAULT_WIDGET_ORDER),
    hideWidget,
    showWidget,
    toggleFavorite,
    handleDragStart,
    handleDrop,
    restoreDefault,
  };
}
