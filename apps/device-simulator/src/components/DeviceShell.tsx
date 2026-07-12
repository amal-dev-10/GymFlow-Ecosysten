"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  Settings2,
  Activity,
  Users,
  Fingerprint,
  CreditCard,
  QrCode,
  DoorOpen,
  Bell,
  ScrollText,
  HardDrive,
  Wrench,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/configuration", label: "Device Configuration", icon: Settings2 },
  { href: "/connection", label: "Connection", icon: Activity },
  { href: "/heartbeat", label: "Heartbeat", icon: Activity },
  { href: "/member-sync", label: "Member Sync", icon: Users },
  { href: "/fingerprint", label: "Fingerprint", icon: Fingerprint },
  { href: "/rfid", label: "RFID", icon: CreditCard },
  { href: "/qr", label: "QR", icon: QrCode },
  { href: "/door-control", label: "Door Control", icon: DoorOpen },
  { href: "/events", label: "Events", icon: Bell },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/diagnostics", label: "Diagnostics", icon: HardDrive },
  { href: "/developer-tools", label: "Developer Tools", icon: Wrench },
  { href: "/settings", label: "Settings", icon: Settings },
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
