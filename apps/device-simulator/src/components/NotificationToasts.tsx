"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useNotificationStore } from "@/store/useNotificationStore";

const LEVEL_CLASS: Record<string, string> = {
  info: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  error: "border-red-500/40 bg-red-500/10 text-red-300",
};

function Toast({ id, level, message }: { id: string; level: string; message: string }) {
  const dismiss = useNotificationStore((s) => s.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(id), 5000);
    return () => clearTimeout(timer);
  }, [id, dismiss]);

  return (
    <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs shadow-lg ${LEVEL_CLASS[level]}`}>
      <span className="flex-1">{message}</span>
      <button onClick={() => dismiss(id)} className="opacity-60 hover:opacity-100">
        <X size={12} />
      </button>
    </div>
  );
}

export function NotificationToasts() {
  const notifications = useNotificationStore((s) => s.notifications);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex w-72 flex-col gap-2">
      {notifications.map((n) => (
        <Toast key={n.id} id={n.id} level={n.level} message={n.message} />
      ))}
    </div>
  );
}
