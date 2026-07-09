"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cable, Gauge, ScanLine, ScrollText } from "lucide-react";

const NAV_ITEMS = [
  { href: "/connection", label: "Connection", icon: Cable },
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/simulation", label: "Simulation", icon: ScanLine },
  { href: "/logs", label: "Logs", icon: ScrollText },
];

export function DeviceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <aside className="w-56 shrink-0 border-r border-neutral-800 bg-neutral-900/60 p-4">
        <div className="mb-6 px-2">
          <p className="text-sm font-semibold tracking-wide text-neutral-200">GymFlow</p>
          <p className="text-xs text-neutral-500">Device Simulator</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
