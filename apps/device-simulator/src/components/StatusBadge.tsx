const COLORS: Record<string, string> = {
  ONLINE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  CONNECTING: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  RECONNECTING: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  OFFLINE: "bg-neutral-500/10 text-neutral-400 border-neutral-500/30",
  DISCONNECTED: "bg-neutral-500/10 text-neutral-400 border-neutral-500/30",
  ERROR: "bg-red-500/10 text-red-400 border-red-500/30",
};

export function StatusBadge({ label }: { label: string }) {
  const className = COLORS[label] || COLORS.OFFLINE;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
