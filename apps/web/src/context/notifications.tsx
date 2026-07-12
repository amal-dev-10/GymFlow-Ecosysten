'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';

interface Notice {
 id: string;
 message: string;
 type: 'success' | 'error' | 'info';
}

interface NotificationContextValue {
 notify: (message: string, type?: Notice['type']) => void;
}

const NotificationContext = createContext<NotificationContextValue>({ notify: () => {} });

export const useNotify = () => useContext(NotificationContext);

const ICONS: Record<Notice['type'], React.ElementType> = {
 success: CheckCircle,
 error: XCircle,
 info: Info,
};

const STYLES: Record<Notice['type'], string> = {
 success: 'bg-success-light border-green-200 text-success',
 error: 'bg-danger-light border-red-200 text-danger',
 info: 'bg-[#0b1320] border-cyan-500/30 text-cyan-300',
};

/**
 * Workspace-wide toast feed, separate from any single page's local toast
 * state - mounted once in the workspace layout so events like a device
 * simulator check-in are visible no matter which page the operator is on.
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
 const [notices, setNotices] = useState<Notice[]>([]);

 const notify = useCallback((message: string, type: Notice['type'] = 'info') => {
 const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
 setNotices((prev) => [...prev, { id, message, type }]);
 setTimeout(() => {
 setNotices((prev) => prev.filter((n) => n.id !== id));
 }, 5000);
 }, []);

 return (
 <NotificationContext.Provider value={{ notify }}>
 {children}
 <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 pointer-events-none">
 {notices.map((n) => {
 const Icon = ICONS[n.type];
 return (
 <div
 key={n.id}
 className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300 ${STYLES[n.type]}`}
 >
 <Icon className="w-4 h-4 shrink-0 mt-0.5" />
 <span>{n.message}</span>
 </div>
 );
 })}
 </div>
 </NotificationContext.Provider>
 );
}
