import { Info } from "lucide-react";

import { createEvent } from "@/app/actions";
import { EventForm } from "@/components/event-form";
import { SectionHeading } from "@/components/ui";
import { listPlayers } from "@/lib/data";
import { isAdminRole } from "@/lib/roles";
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
  if (!user || !isAdminRole(user.role)) {
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
      <EventForm
        action={createEvent}
        players={activePlayers}
        configured={configured}
        serverError={error}
      />
    </div>
  );
}
