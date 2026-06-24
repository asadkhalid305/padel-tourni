"use client";

import {
  CalendarDays,
  CircleGauge,
  History,
  LogOut,
  Plus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { use } from "react";
import type { ReactNode } from "react";

import { signOut } from "@/app/actions";
import { BrandLogo } from "@/components/brand-logo";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { isWorkspaceAdminRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { AuthenticatedAppUser } from "@/lib/supabase/server";

const navigation = [
  { href: "/", label: "Dashboard", icon: CircleGauge },
  { href: "/players", label: "Players", icon: Users },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/history", label: "History", icon: History },
];

export function AppShell({
  children,
  userPromise,
  activePlayerCountPromise,
}: {
  children: ReactNode;
  userPromise: Promise<AuthenticatedAppUser | null>;
  activePlayerCountPromise: Promise<number>;
}) {
  const pathname = usePathname();

  if (pathname === "/login" || pathname.startsWith("/invites/")) {
    return children;
  }

  const user = use(userPromise);
  const isAdmin = user ? isWorkspaceAdminRole(user.activeWorkspaceRole) : false;
  const activePlayerCount = use(activePlayerCountPromise);
  const canCreateEvent = activePlayerCount >= 4;

  return (
    <div className="h-dvh overflow-hidden lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="hidden min-h-0 overflow-y-auto border-r border-white/10 bg-[var(--ink)] p-5 text-white lg:flex lg:flex-col">
        <Link href="/" className="px-2 py-4" aria-label="Padel Tourni home">
          <BrandLogo tagline />
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
        {isAdmin ? (
          <CreateEventShortcut canCreateEvent={canCreateEvent} sidebar />
        ) : null}
        <div className="mt-auto space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-bold">Fair play first</p>
            <p className="mt-1 text-xs leading-5 text-white/55">
              Rotations balance court time, partners, opponents, and ratings.
            </p>
          </div>
          <form action={signOut}>
            <PendingSubmitButton
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent px-3 text-sm font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
              variant="ghost"
              pendingLabel="Signing out..."
            >
              <LogOut size={17} />
              Sign out
            </PendingSubmitButton>
          </form>
        </div>
      </aside>

      <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-emerald-950/5 bg-white/55 px-5 py-4 backdrop-blur lg:px-9">
          <div className="flex items-center justify-between">
            <Link href="/" className="lg:hidden" aria-label="Padel Tourni home">
              <BrandLogo markClassName="size-9" />
            </Link>
            <p className="hidden text-sm font-semibold text-slate-500 lg:block">
              {user?.email ?? "Recreational events, run beautifully."}
            </p>
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <CreateEventShortcut canCreateEvent={canCreateEvent} />
              ) : null}
              <form action={signOut}>
                <PendingSubmitButton
                  className="grid size-10 place-items-center rounded-xl border border-emerald-950/10 bg-white text-[var(--ink)]"
                  aria-label="Sign out"
                  variant="ghost"
                  pendingLabel={<span className="sr-only">Signing out...</span>}
                >
                  <LogOut size={17} />
                </PendingSubmitButton>
              </form>
            </div>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1500px] p-5 pb-28 sm:p-7 sm:pb-28 lg:p-9 lg:pb-9">
            {children}
          </div>
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

function CreateEventShortcut({
  canCreateEvent,
  sidebar = false,
}: {
  canCreateEvent: boolean;
  sidebar?: boolean;
}) {
  const label = "Create event";

  if (!canCreateEvent) {
    return (
      <span
        aria-disabled="true"
        title="Add at least four active players before creating an event."
        className={cn(
          "inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-4 text-sm font-black text-slate-500",
          sidebar ? "mt-6 min-h-12" : "min-h-10 py-2.5",
        )}
      >
        {sidebar ? <Plus size={18} /> : null}
        {label}
      </span>
    );
  }

  return (
    <Link
      href="/events/new"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-black transition",
        sidebar
          ? "mt-6 min-h-12 bg-[var(--lime)] px-4 text-[var(--ink)] hover:bg-[#c9f66d]"
          : "min-h-10 bg-[var(--ink)] px-4 py-2.5 text-white",
      )}
    >
      {sidebar ? <Plus size={18} /> : null}
      {label}
    </Link>
  );
}
