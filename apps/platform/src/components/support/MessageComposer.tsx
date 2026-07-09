'use client';

import { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Code, List, Paperclip, Lock, Send, Loader2, FileText, ChevronDown, Sparkles } from 'lucide-react';
import { platformSupportApi } from '@/lib/api';

const SAVED_REPLIES = [
  { label: 'Acknowledge & Investigating', body: 'Thanks for reaching out - we\'ve received your report and are looking into it now. We\'ll follow up shortly with an update.' },
  { label: 'Requesting More Info', body: 'To help us investigate further, could you share:\n- The organization/branch affected\n- Steps to reproduce\n- Any error messages you saw' },
  { label: 'Resolved - Please Confirm', body: 'This should be resolved now. Could you confirm on your end? Let us know if you run into it again.' },
  { label: 'Escalated Notice', body: 'We\'ve escalated this to our engineering team for further investigation. We\'ll keep you posted on progress.' },
];

interface Props {
  ticketId: string;
  staff: { id: string; fullName: string }[];
  onPosted: () => void;
}

export default function MessageComposer({ ticketId, staff, onPosted }: Props) {
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wrapSelection = (before: string, after = before) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value } = el;
    const selected = value.slice(selectionStart, selectionEnd) || 'text';
    const next = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
    setBody(next);
    setTimeout(() => el.focus(), 0);
  };

  const handleChange = (value: string) => {
    setBody(value);
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const upToCursor = value.slice(0, cursor);
    const match = upToCursor.match(/@([\w ]{0,20})$/);
    setMentionQuery(match ? match[1] : null);
  };

  const insertMention = (name: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart;
    const upToCursor = body.slice(0, cursor);
    const replaced = upToCursor.replace(/@([\w ]{0,20})$/, `@${name} `);
    setBody(replaced + body.slice(cursor));
    setMentionQuery(null);
    setTimeout(() => el.focus(), 0);
  };

  const filteredStaff = mentionQuery != null ? staff.filter((s) => s.fullName.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6) : [];

  const submit = async () => {
    if (!body.trim() && !pendingFile) return;
    setBusy(true);
    try {
      const mentions = Array.from(body.matchAll(/@([\w ]+?)(?=[,.!?;:]|\s@|$)/g)).map((m) => m[1].trim());
      let messageId: string | undefined;
      if (body.trim()) {
        const message = await platformSupportApi.postMessage(ticketId, { body, isInternal, mentions });
        messageId = message.id;
      }
      if (pendingFile) {
        await platformSupportApi.uploadAttachment(ticketId, pendingFile, messageId);
        setPendingFile(null);
      }
      setBody('');
      onPosted();
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, isInternal, pendingFile]);

  const toolBtn = 'p-1.5 rounded-lg text-slate-500 hover:text-indigo-300 hover:bg-slate-900 transition-colors';

  return (
    <div className={`border-t p-3 shrink-0 ${isInternal ? 'border-amber-500/20 bg-amber-500/5' : 'border-slate-850'}`}>
      <div className="flex flex-wrap items-center gap-1 mb-2">
        <button onClick={() => wrapSelection('**')} className={toolBtn} title="Bold"><Bold size={13} /></button>
        <button onClick={() => wrapSelection('_')} className={toolBtn} title="Italic"><Italic size={13} /></button>
        <button onClick={() => wrapSelection('`')} className={toolBtn} title="Code"><Code size={13} /></button>
        <button onClick={() => setBody((b) => b + '\n- ')} className={toolBtn} title="Bullet list"><List size={13} /></button>
        <button onClick={() => fileInputRef.current?.click()} className={toolBtn} title="Attach a file"><Paperclip size={13} /></button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setPendingFile(e.target.files?.[0] || null)} />

        <div className="relative">
          <button onClick={() => setTemplatesOpen((v) => !v)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold text-slate-500 hover:text-indigo-300 hover:bg-slate-900 transition-colors">
            <FileText size={12} /> Templates <ChevronDown size={11} />
          </button>
          {templatesOpen && (
            <div className="absolute left-0 bottom-full mb-1 w-64 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 p-1.5">
              {SAVED_REPLIES.map((r) => (
                <button key={r.label} onClick={() => { setBody((b) => (b ? b + '\n' + r.body : r.body)); setTemplatesOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-[11px] font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors">
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setIsInternal((v) => !v)}
          className={`ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
            isInternal ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-slate-900 border-slate-850 text-slate-500 hover:text-slate-300'
          }`}
        >
          <Lock size={11} /> {isInternal ? 'Internal Note' : 'Customer Reply'}
        </button>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => handleChange(e.target.value)}
          rows={3}
          placeholder={isInternal ? 'Add an internal note (not visible to the customer)... use @ to mention a teammate' : 'Reply to the customer... use @ to mention a teammate'}
          className="w-full bg-[#0b101d] border border-slate-800/80 focus:border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none resize-none"
        />
        {filteredStaff.length > 0 && (
          <div className="absolute left-2 bottom-full mb-1 w-56 rounded-2xl bg-[#0b101d] border border-slate-800 shadow-2xl z-30 p-1.5">
            {filteredStaff.map((s) => (
              <button key={s.id} onClick={() => insertMention(s.fullName)} className="w-full text-left px-3 py-2 rounded-lg text-[11px] font-semibold text-slate-300 hover:bg-slate-900 hover:text-white transition-colors">
                @{s.fullName}
              </button>
            ))}
          </div>
        )}
      </div>

      {pendingFile && (
        <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
          <Paperclip size={11} /> {pendingFile.name}
          <button onClick={() => setPendingFile(null)} className="text-rose-400 hover:text-rose-300">Remove</button>
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-slate-600 flex items-center gap-1"><Sparkles size={10} /> ⌘/Ctrl+Enter to send</span>
        <button
          disabled={busy || (!body.trim() && !pendingFile)}
          onClick={submit}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-300 text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} {isInternal ? 'Add Note' : 'Send Reply'}
        </button>
      </div>
    </div>
  );
}
