import { Info, Sparkles } from "lucide-react";

import { createEvent } from "@/app/actions";
import { EventAvailabilityFields } from "@/components/event-availability-fields";
import { Button, Card, SectionHeading } from "@/components/ui";
import { listPlayers } from "@/lib/data";
import {
  getAuthenticatedUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "New event" };

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [players, { error }, user] = await Promise.all([
    listPlayers(),
    searchParams,
    getAuthenticatedUser(),
  ]);
  if (user?.role !== "admin") {
    redirect("/events");
  }
  const activePlayers = players.filter((player) => player.isActive);
  const configured = isSupabaseConfigured();

  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow="New event"
        title="Set the courts. We’ll shape the draw."
        description="Choose the roster and court availability by round. The scheduler handles rotation fairness and team balance."
      />
      {!configured ? (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Info className="shrink-0" size={20} />
          Demo mode is read-only. Add the Supabase environment variables to
          create persistent events.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      ) : null}
      <form
        action={createEvent}
        className="grid gap-6 xl:grid-cols-[1fr_420px]"
      >
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-black">Event details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="field-label">Event name</span>
                <input
                  className="field"
                  name="name"
                  placeholder="Sunday court social"
                  required
                />
              </label>
              <label className="block">
                <span className="field-label">Venue</span>
                <input
                  className="field"
                  name="venue"
                  placeholder="Padel club"
                />
              </label>
              <label className="block">
                <span className="field-label">Starts</span>
                <input
                  className="field"
                  name="startsAt"
                  type="datetime-local"
                  required
                />
              </label>
              <EventAvailabilityFields />
              <label className="block sm:col-span-2">
                <span className="field-label">Notes</span>
                <textarea
                  className="field min-h-24 resize-y"
                  name="notes"
                  placeholder="Format, arrival notes, or house rules"
                />
              </label>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <Sparkles className="text-[var(--green)]" size={19} />
              <h2 className="text-xl font-black">Select players</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Choose at least four. Names and ratings are snapshotted now.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {activePlayers.map((player) => (
                <label
                  key={player.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50"
                >
                  <input
                    name="playerIds"
                    type="checkbox"
                    value={player.id}
                    className="size-4 accent-emerald-700"
                  />
                  <span>
                    <span className="block text-sm font-bold">
                      {player.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      Rating {player.rating.toFixed(1)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </Card>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <Card className="bg-[var(--ink)] text-white">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--lime)]">
              Fairness priorities
            </p>
            <ol className="mt-5 space-y-4">
              {[
                "Balanced court appearances",
                "Short rest streaks",
                "Unique partners",
                "Diverse opponents",
                "Rating-balanced teams",
              ].map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-black text-[var(--lime)]">
                    {index + 1}
                  </span>
                  <span className="pt-1 text-sm font-semibold text-white/80">
                    {item}
                  </span>
                </li>
              ))}
            </ol>
            <Button
              className="mt-7 w-full"
              variant="secondary"
              disabled={!configured}
            >
              Generate event
            </Button>
          </Card>
        </div>
      </form>
    </div>
  );
}
