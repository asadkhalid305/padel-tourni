import { ArrowRight, Calendar, MapPin, Users } from "lucide-react";
import Link from "next/link";

import { Badge, Card, SectionHeading } from "@/components/ui";
import { listEvents } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Events" };

function eventTone(status: string) {
  if (status === "live") return "live" as const;
  if (status === "completed") return "success" as const;
  return "info" as const;
}

export default async function EventsPage() {
  const events = await listEvents();
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow="Event operations"
        title="Events"
        description="Everything from first draw to final table, kept together."
        action={
          <Link
            href="/events/new"
            className="inline-flex min-h-11 items-center rounded-xl bg-[var(--ink)] px-4 text-sm font-bold text-white"
          >
            Create event
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {events.map((event) => (
          <Card key={event.id} className="group">
            <div className="flex items-start justify-between gap-3">
              <Badge tone={eventTone(event.status)}>{event.status}</Badge>
              <span className="text-xs font-bold text-slate-400">
                {event.completedMatches}/{event.totalMatches} played
              </span>
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-[var(--ink)]">
              {event.name}
            </h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2">
                <Calendar size={16} className="text-[var(--green)]" />
                {formatDate(event.startsAt)}
              </p>
              <p className="flex items-center gap-2">
                <MapPin size={16} className="text-[var(--green)]" />
                {event.venue || "Venue not set"}
              </p>
              <p className="flex items-center gap-2">
                <Users size={16} className="text-[var(--green)]" />
                {event.playerCount} players
              </p>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[var(--lime)]"
                style={{
                  width: `${
                    event.totalMatches
                      ? (event.completedMatches / event.totalMatches) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
            <Link
              href={`/events/${event.id}`}
              className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-[var(--ink)] transition group-hover:bg-[var(--ink)] group-hover:text-white"
            >
              Manage event <ArrowRight size={17} />
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
