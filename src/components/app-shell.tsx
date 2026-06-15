"use client";

import { CalendarDays, CircleGauge, History, Plus, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Dashboard", icon: CircleGauge },
  { href: "/players", label: "Players", icon: Users },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/history", label: "History", icon: History },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="hidden border-r border-white/10 bg-[var(--ink)] p-5 text-white lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-3 px-2 py-4">
          <span className="grid size-11 place-items-center rounded-2xl bg-[var(--lime)] text-lg font-black text-[var(--ink)]">
            P
          </span>
          <span>
            <span className="block text-lg font-black tracking-tight">
              Padel Tour
            </span>
            <span className="text-xs text-white/55">Event command center</span>
          </span>
        </Link>
        <nav className="mt-8 space-y-2">
          {navigation.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition",
                  active
                    ? "bg-white text-[var(--ink)]"
                    : "text-white/65 hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/events/new"
          className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--lime)] px-4 text-sm font-black text-[var(--ink)] transition hover:bg-[#c9f66d]"
        >
          <Plus size={18} />
          New event
        </Link>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-bold">Fair play first</p>
          <p className="mt-1 text-xs leading-5 text-white/55">
            Rotations balance court time, partners, opponents, and ratings.
          </p>
        </div>
      </aside>

      <main className="min-w-0 pb-24 lg:pb-0">
        <header className="flex items-center justify-between border-b border-emerald-950/5 bg-white/55 px-5 py-4 backdrop-blur lg:px-9">
          <Link
            href="/"
            className="flex items-center gap-2 font-black lg:hidden"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-[var(--lime)]">
              P
            </span>
            Padel Tour
          </Link>
          <p className="hidden text-sm font-semibold text-slate-500 lg:block">
            Recreational events, run beautifully.
          </p>
          <Link
            href="/events/new"
            className="rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-bold text-white"
          >
            New event
          </Link>
        </header>
        <div className="mx-auto max-w-[1500px] p-5 sm:p-7 lg:p-9">
          {children}
        </div>
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 rounded-2xl border border-white/70 bg-[var(--ink)] p-1.5 text-white shadow-2xl lg:hidden">
        {navigation.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold",
                active ? "bg-white text-[var(--ink)]" : "text-white/60",
              )}
            >
              <item.icon size={19} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
