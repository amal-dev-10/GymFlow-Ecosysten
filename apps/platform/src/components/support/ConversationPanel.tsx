'use client';

import { useEffect, useRef, useState } from 'react';
import { Lock, Paperclip, User, Headset, Server, Download } from 'lucide-react';
import { renderMarkdownLite } from '@/lib/markdownLite';
import type { TicketWorkspaceDTO } from '@/types/support';
import { StatusBadge, PriorityBadge } from './SupportBadges';
import MessageComposer from './MessageComposer';

const AUTHOR_ICON: Record<string, typeof User> = { Customer: User, Agent: Headset, System: Server };

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString();
}

export default function ConversationPanel({
  workspace,
  staff,
  onRefresh,
  onOpenStatusMenu,
}: {
  workspace: TicketWorkspaceDTO;
  staff: { id: string; fullName: string }[];
  onRefresh: () => void;
  onOpenStatusMenu: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showInternal, setShowInternal] = useState(true);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [workspace.messages.length]);

  const visibleMessages = showInternal ? workspace.messages : workspace.messages.filter((m) => !m.isInternal);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-850 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[10px] font-bold text-slate-500">#{workspace.ticketNumber} · {workspace.organization?.name}</span>
            <h2 className="text-sm font-black text-white truncate">{workspace.subject}</h2>
          </div>
          <button onClick={onOpenStatusMenu} className="shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-slate-800 text-slate-300 hover:border-indigo-500/30 transition-colors">
            Manage
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <StatusBadge status={workspace.status} />
          <PriorityBadge priority={workspace.priority} />
          <span className="text-[10px] text-slate-500">Assigned to {workspace.assignedEngineerName || 'Unassigned'}</span>
        </div>
      </div>

      {/* Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3 min-h-0">
        {visibleMessages.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-10">No messages yet. Start the conversation below.</p>
        ) : (
          visibleMessages.map((m) => {
            const Icon = AUTHOR_ICON[m.authorType] || User;
            return (
              <div key={m.id} className={`rounded-2xl border p-3 ${m.isInternal ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-900/40 border-slate-850'}`}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-200">
                    <Icon size={12} className={m.isInternal ? 'text-amber-400' : 'text-indigo-400'} />
                    {m.authorName}
                    {m.isInternal && <span className="flex items-center gap-0.5 text-[9px] text-amber-400"><Lock size={9} /> Internal</span>}
                  </span>
                  <span className="text-[10px] text-slate-600">{fmtDateTime(m.createdAt)}</span>
                </div>
                <div className="text-slate-300">{renderMarkdownLite(m.body)}</div>
                {m.attachments && m.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {m.attachments.map((a) => (
                      <a key={a.id} href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/uploads/support/${a.storagePath}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-indigo-300 hover:text-indigo-200 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                        <Paperclip size={10} /> {a.fileName} <Download size={10} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
        {workspace.attachments.filter((a) => !a.messageId).length > 0 && (
          <div className="pt-2 border-t border-slate-900/60">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Attachments</p>
            <div className="flex flex-wrap gap-2">
              {workspace.attachments.filter((a) => !a.messageId).map((a) => (
                <a key={a.id} href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/uploads/support/${a.storagePath}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-indigo-300 hover:text-indigo-200 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                  <Paperclip size={10} /> {a.fileName} <Download size={10} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pt-2 shrink-0">
        <button onClick={() => setShowInternal((v) => !v)} className="text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors">
          {showInternal ? 'Hide internal notes' : 'Show internal notes'}
        </button>
      </div>

      <MessageComposer ticketId={workspace.id} staff={staff} onPosted={onRefresh} />
    </div>
  );
}
