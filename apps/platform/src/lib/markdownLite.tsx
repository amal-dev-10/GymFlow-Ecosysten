import React from 'react';

// A deliberately small markdown-lite renderer for the Support Conversation
// composer - bold/italic/code/bullets/@mentions only, no new dependency
// (mirrors the zero-dependency approach already used for CSV/Excel/PDF
// export elsewhere in this app). Not a general-purpose markdown parser.

function renderInline(text: string, key: number): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`|@[A-Za-z][\w .]*?(?=[,.!?;:]|\s@|$))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith('**')) parts.push(<strong key={`${key}-${i}`} className="font-bold text-slate-100">{token.slice(2, -2)}</strong>);
    else if (token.startsWith('*') || token.startsWith('_')) parts.push(<em key={`${key}-${i}`} className="italic">{token.slice(1, -1)}</em>);
    else if (token.startsWith('`')) parts.push(<code key={`${key}-${i}`} className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-300">{token.slice(1, -1)}</code>);
    else if (token.startsWith('@')) parts.push(<span key={`${key}-${i}`} className="text-indigo-300 font-semibold bg-indigo-500/10 px-1 rounded">{token}</span>);
    else parts.push(token);
    lastIndex = match.index + token.length;
    i++;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function renderMarkdownLite(body: string): React.ReactNode {
  const lines = body.split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: number) => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={`list-${key}`} className="list-disc list-inside space-y-0.5 my-1">
        {listBuffer.map((item, idx) => <li key={idx} className="text-xs">{renderInline(item, idx)}</li>)}
      </ul>,
    );
    listBuffer = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listBuffer.push(trimmed.slice(2));
      return;
    }
    flushList(idx);
    if (trimmed.length === 0) {
      blocks.push(<div key={idx} className="h-2" />);
    } else {
      blocks.push(<p key={idx} className="text-xs leading-relaxed">{renderInline(line, idx)}</p>);
    }
  });
  flushList(lines.length);

  return <div className="space-y-0.5">{blocks}</div>;
}
