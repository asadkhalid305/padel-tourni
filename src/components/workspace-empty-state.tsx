import { CalendarPlus, UsersRound } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui";

export function WorkspaceEmptyState({
  canCreateEvent,
  canManage,
}: {
  canCreateEvent: boolean;
  canManage: boolean;
}) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/80">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--green)]">
            Private club
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--ink)]">
            Start with your own roster.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            This club is empty and private. Add the players you want to manage,
            then create an event when the roster is ready.
          </p>
        </div>
        {canManage ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3">
              <Link
                href="/players"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white"
              >
                <UsersRound size={17} />
                Add players
              </Link>
              {canCreateEvent ? (
                <Link
                  href="/events/new"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--lime)] px-4 text-sm font-bold text-[var(--ink)]"
                >
                  <CalendarPlus size={17} />
                  Create event
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-4 text-sm font-bold text-slate-500"
                >
                  <CalendarPlus size={17} />
                  Create event
                </span>
              )}
            </div>
            {!canCreateEvent ? (
              <p className="max-w-sm text-xs font-semibold leading-5 text-slate-500">
                Add at least four players before creating an event.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
