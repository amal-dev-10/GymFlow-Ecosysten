'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import PlatformEmptyState from '@/components/platform/PlatformEmptyState';
import TicketDetailShell from '@/components/support/TicketDetailShell';
import TicketRail from '@/components/support/TicketRail';
import ConversationPanel from '@/components/support/ConversationPanel';
import ContextSidebar from '@/components/support/ContextSidebar';
import { platformSupportApi, platformUsersApi } from '@/lib/api';
import type { TicketWorkspaceDTO } from '@/types/support';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<TicketWorkspaceDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [staff, setStaff] = useState<{ id: string; fullName: string }[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    platformSupportApi
      .getTicketWorkspace(id)
      .then(setWorkspace)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
    platformUsersApi.list({ limit: 100 } as any).then((res: any) => setStaff(res.data || [])).catch(() => setStaff([]));
  }, [load]);

  if (notFound) {
    return (
      <div className="space-y-6">
        <button onClick={() => router.push('/operations/support')} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-300 transition-colors">
          <ChevronLeft size={14} /> Back to Support Center
        </button>
        <PlatformEmptyState title="Ticket not found" description="This ticket may have been deleted or the link is invalid." />
      </div>
    );
  }

  if (loading || !workspace) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-48 bg-slate-900 rounded-lg" />
        <div className="h-[560px] bg-slate-900/60 border border-slate-900 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => router.push('/operations/support?section=tickets')} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-300 transition-colors">
        <ChevronLeft size={14} /> Back to Support Center
      </button>

      <TicketDetailShell
        leftCollapsed={leftCollapsed}
        onToggleLeft={() => setLeftCollapsed((v) => !v)}
        leftRail={<TicketRail activeId={workspace.id} />}
        center={<ConversationPanel workspace={workspace} staff={staff} onRefresh={load} onOpenStatusMenu={() => showToast('Ticket details are in the right-hand sidebar.')} />}
        right={<ContextSidebar workspace={workspace} staff={staff} onRefresh={load} showToast={showToast} />}
      />

      {toast && (
        <div className="fixed top-5 right-5 z-[100] flex items-center gap-3 p-4 bg-[#0b101d]/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl max-w-sm">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-xs font-bold text-slate-100">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
